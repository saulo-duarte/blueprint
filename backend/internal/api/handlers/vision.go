package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"log"
	"os"
	"path/filepath"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/blueprint/backend/internal/geometry"
	"github.com/blueprint/backend/internal/vision"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"sync"
)

type VisionHandler struct {
	VisionClient *vision.Client
	Sanitizer    *geometry.Sanitizer
	Tasks        sync.Map
}

type TaskStatus string

const (
	TaskStatusAwaiting   TaskStatus = "awaiting"
	TaskStatusProcessing TaskStatus = "processing"
	TaskStatusCompleted  TaskStatus = "completed"
	TaskStatusFailed     TaskStatus = "failed"
)

type ProcessingTask struct {
	ID     string               `json:"id"`
	Status TaskStatus           `json:"status"`
	Result *geometry.AIResponse `json:"result,omitempty"`
	Error  string               `json:"error,omitempty"`
}

func NewVisionHandler(vc *vision.Client) *VisionHandler {
	return &VisionHandler{
		VisionClient: vc,
		Sanitizer:    geometry.NewSanitizer(),
	}
}

func (h *VisionHandler) MapFloorplan(c *fiber.Ctx) error {
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "No file provided"})
	}

	// Read file content
	src, err := file.Open()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to open file"})
	}
	defer src.Close()

	data, err := io.ReadAll(src)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to read file"})
	}

	// Extract image dimensions
	imgConfig, format, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil {
		log.Printf("[ERROR] Failed to decode image: %v (data length: %d)", err, len(data))
		return c.Status(400).JSON(fiber.Map{
			"error": fmt.Sprintf("Failed to decode image dimensions: %v. Certifique-se de que é um PNG, JPEG ou WebP válido.", err),
		})
	}
	log.Printf("[INFO] Decoded image format: %s (%dx%d)", format, imgConfig.Width, imgConfig.Height)

	// Extract optional refinement prompt
	refinementPrompt := c.FormValue("refinement_prompt")

	// 1. Vision Analyst Agent (Semantic Filter)
	analystReport, err := h.VisionClient.AnalyzeFloorPlan(c.Context(), data, file.Header.Get("Content-Type"), imgConfig.Width, imgConfig.Height, refinementPrompt)
	if err != nil {
		log.Printf("[ERROR] Analyst Agent failed: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": fmt.Sprintf("Analyst Agent failed: %v", err)})
	}

	log.Printf("[INFO] Analyst detected %d environments", len(analystReport.Environments))
	if refinementPrompt != "" {
		log.Printf("[INFO] Refinement Prompt: %s", refinementPrompt)
	}

	for _, env := range analystReport.Environments {
		log.Printf("[DEBUG] Env: %s (%s)", env.Name, env.ShapeDescription)
	}

	if len(analystReport.Environments) == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "No valid environments detected by the Analyst Agent"})
	}

	// 2. Vision Builder Agent (Structural Mapping)
	msg, err := h.VisionClient.ProcessFloorplan(c.Context(), data, file.Header.Get("Content-Type"), analystReport, refinementPrompt)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": fmt.Sprintf("Builder Agent failed: %v", err)})
	}

	response := geometry.AIResponse{
		Rooms:  []geometry.Room{},
		Doors:  []geometry.Door{},
		Errors: []string{},
	}

	// Handle Tool Use
	for _, block := range msg.Content {
		if block.Type == "text" {
			log.Printf("[AI THINKING] %s", block.Text)
		}
		if block.Type == "tool_use" {
			log.Printf("[TOOL CALL] Found tool: %s", block.Name)
			h.handleToolUse(block, &response)
		}
	}

	// Final Sanitization Loop
	for i := range response.Rooms {
		h.Sanitizer.SanitizeRoom(&response.Rooms[i])
	}

	// Save as JSON (POC requirement)
	h.saveResponseToJSON(&response)

	return c.JSON(response)
}

func (h *VisionHandler) MapFloorplanAsync(c *fiber.Ctx) error {
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "No file provided"})
	}

	// Read file content
	src, err := file.Open()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to open file"})
	}
	defer src.Close()

	data, err := io.ReadAll(src)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to read file"})
	}

	// Extract image dimensions
	imgConfig, format, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil {
		log.Printf("[ERROR] Failed to decode image: %v (data length: %d)", err, len(data))
		return c.Status(400).JSON(fiber.Map{
			"error": fmt.Sprintf("Failed to decode image dimensions: %v. Certifique-se de que é um PNG, JPEG ou WebP válido.", err),
		})
	}
	log.Printf("[INFO] Decoded image format: %s (%dx%d)", format, imgConfig.Width, imgConfig.Height)

	// Extract optional refinement prompt
	refinementPrompt := c.FormValue("refinement_prompt")
	contentType := file.Header.Get("Content-Type")

	// Create Task
	taskID := uuid.New().String()
	task := &ProcessingTask{
		ID:     taskID,
		Status: TaskStatusAwaiting,
	}
	h.Tasks.Store(taskID, task)

	// Start Background Processing
	go func() {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("[PANIC] Background process panicked: %v", r)
				task.Status = TaskStatusFailed
				task.Error = fmt.Sprintf("Internal error: %v", r)
			}
		}()

		task.Status = TaskStatusProcessing
		
		// 1. Vision Analyst Agent
		analystReport, err := h.VisionClient.AnalyzeFloorPlan(context.Background(), data, contentType, imgConfig.Width, imgConfig.Height, refinementPrompt)
		if err != nil {
			log.Printf("[ERROR] Analyst Agent failed for task %s: %v", taskID, err)
			task.Status = TaskStatusFailed
			task.Error = fmt.Sprintf("Analyst Agent failed: %v", err)
			return
		}

		if len(analystReport.Environments) == 0 {
			task.Status = TaskStatusFailed
			task.Error = "No valid environments detected by the Analyst Agent"
			return
		}

		// 2. Vision Builder Agent
		msg, err := h.VisionClient.ProcessFloorplan(context.Background(), data, contentType, analystReport, refinementPrompt)
		if err != nil {
			log.Printf("[ERROR] Builder Agent failed for task %s: %v", taskID, err)
			task.Status = TaskStatusFailed
			task.Error = fmt.Sprintf("Builder Agent failed: %v", err)
			return
		}

		response := geometry.AIResponse{
			Rooms:  []geometry.Room{},
			Doors:  []geometry.Door{},
			Errors: []string{},
		}

		// Handle Tool Use
		for _, block := range msg.Content {
			if block.Type == "tool_use" {
				h.handleToolUse(block, &response)
			}
		}

		// Final Sanitization Loop
		for i := range response.Rooms {
			h.Sanitizer.SanitizeRoom(&response.Rooms[i])
		}

		// Save as JSON
		h.saveResponseToJSON(&response)

		task.Result = &response
		task.Status = TaskStatusCompleted
		log.Printf("[INFO] Task %s completed successfully", taskID)
	}()

	return c.JSON(fiber.Map{
		"task_id": taskID,
		"status":  task.Status,
	})
}

func (h *VisionHandler) GetTaskStatus(c *fiber.Ctx) error {
	id := c.Params("id")
	val, ok := h.Tasks.Load(id)
	if !ok {
		return c.Status(404).JSON(fiber.Map{"error": "Task not found"})
	}

	task := val.(*ProcessingTask)
	return c.JSON(task)
}

func (h *VisionHandler) handleToolUse(block anthropic.ContentBlockUnion, resp *geometry.AIResponse) {
	log.Printf("[DEBUG] Parsing tool %s with input: %s", block.Name, string(block.Input))
	switch block.Name {
	case "add_room_polygon":
		var room geometry.Room
		if err := json.Unmarshal(block.Input, &room); err != nil {
			log.Printf("[ERROR] Failed to unmarshal room: %v", err)
			return
		}
		room.Type = "polygon"
		resp.Rooms = append(resp.Rooms, room)
	case "add_room_rect":
		var room geometry.Room
		if err := json.Unmarshal(block.Input, &room); err != nil {
			log.Printf("[ERROR] Failed to unmarshal rect: %v", err)
			return
		}
		room.Type = "rect"
		// Convert rect bounds to vertices for unified handling
		room.Vertices = []geometry.Point{
			{X: room.X, Y: room.Y},
			{X: room.X + room.W, Y: room.Y},
			{X: room.X + room.W, Y: room.Y + room.H},
			{X: room.X, Y: room.Y + room.H},
		}
		resp.Rooms = append(resp.Rooms, room)
	case "add_door":
		var door geometry.Door
		if err := json.Unmarshal(block.Input, &door); err != nil {
			log.Printf("[ERROR] Failed to unmarshal door: %v", err)
			return
		}
		// Map p [x, y] back to X, Y for legacy frontend support if needed
		if len(door.P) == 2 {
			door.X = door.P[0]
			door.Y = door.P[1]
		}
		resp.Doors = append(resp.Doors, door)
	case "add_stair":
		var stair geometry.Stair
		if err := json.Unmarshal(block.Input, &stair); err != nil {
			log.Printf("[ERROR] Failed to unmarshal stair: %v", err)
			return
		}
		if len(stair.P) == 2 {
			stair.X = stair.P[0]
			stair.Y = stair.P[1]
		}
		resp.Stairs = append(resp.Stairs, stair)
	case "set_metadata":
		var meta struct {
			ProjectName string `json:"n"`
		}
		if err := json.Unmarshal(block.Input, &meta); err != nil {
			log.Printf("[ERROR] Failed to unmarshal metadata: %v", err)
			return
		}
		resp.ProjectName = meta.ProjectName
	default:
		log.Printf("[WARNING] Unhandled tool: %s", block.Name)
	}
}

func (h *VisionHandler) saveResponseToJSON(resp *geometry.AIResponse) {
	dir := "./storage/projects"
	os.MkdirAll(dir, 0755)
	
	resp.ID = uuid.New().String()
	filename := filepath.Join(dir, fmt.Sprintf("project_%s.json", resp.ID))
	data, _ := json.MarshalIndent(resp, "", "  ")
	os.WriteFile(filename, data, 0644)
}

func (h *VisionHandler) ListProjects(c *fiber.Ctx) error {
	dir := "./storage/projects"
	files, err := os.ReadDir(dir)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to read storage"})
	}

	projects := []string{}
	for _, f := range files {
		if !f.IsDir() && filepath.Ext(f.Name()) == ".json" {
			projects = append(projects, f.Name())
		}
	}
	return c.JSON(fiber.Map{"projects": projects})
}

func (h *VisionHandler) GetProject(c *fiber.Ctx) error {
	id := c.Params("id")
	filename := filepath.Join("./storage/projects", fmt.Sprintf("project_%s.json", id))
	
	if _, err := os.Stat(filename); os.IsNotExist(err) {
		return c.Status(404).JSON(fiber.Map{"error": "Project not found"})
	}

	return c.Download(filename)
}
