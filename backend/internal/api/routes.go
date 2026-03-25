package api

import (
	"github.com/blueprint/backend/internal/api/handlers"
	"github.com/blueprint/backend/internal/vision"
	"github.com/gofiber/fiber/v2"
)

func RegisterRoutes(app *fiber.App) {
	// Initialize clients
	visionClient := vision.NewClient()
	
	// Initialize handlers
	visionHandler := handlers.NewVisionHandler(visionClient)

	// API Group
	api := app.Group("/api/v1")

	// Routes
	api.Post("/vision/map-floorplan", visionHandler.MapFloorplan)
	api.Get("/projects", visionHandler.ListProjects)
	api.Get("/projects/:id", visionHandler.GetProject)
}
