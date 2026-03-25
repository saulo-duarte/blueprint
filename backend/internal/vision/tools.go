package vision

import (
	"github.com/anthropics/anthropic-sdk-go"
)

// GetToolDefinitions returns the tool schemas for Claude
func GetToolDefinitions() []anthropic.ToolUnionParam {
	return []anthropic.ToolUnionParam{
		{
			OfTool: &anthropic.ToolParam{
				Name:        "add_room_polygon",
				Description: anthropic.String("Creates a closed polygon room with multiple vertices. Use this for freeform shapes or non-rectangular rooms."),
				InputSchema: anthropic.ToolInputSchemaParam{
					Type: "object",
					Properties: map[string]interface{}{
						"n": map[string]interface{}{
							"type":        "string",
							"description": "Room name (e.g., 'Sala').",
						},
						"pts": map[string]interface{}{
							"type": "array",
							"items": map[string]interface{}{
								"type": "array",
								"minItems": 2,
								"maxItems": 2,
								"items": map[string]interface{}{"type": "number"},
								"description": "[x, y] normalized coordinates (0-1).",
							},
						},
						"c": map[string]interface{}{
							"type":        "string",
							"description": "Optional color hint.",
						},
					},
					Required: []string{"n", "pts"},
				},
			},
		},
		{
			OfTool: &anthropic.ToolParam{
				Name:        "add_room_rect",
				Description: anthropic.String("Creates a simple rectangular room. Use this for standard 4-wall rooms."),
				InputSchema: anthropic.ToolInputSchemaParam{
					Type: "object",
					Properties: map[string]interface{}{
						"n": map[string]interface{}{"type": "string"},
						"x": map[string]interface{}{"type": "number", "description": "Top-left X (0-1)"},
						"y": map[string]interface{}{"type": "number", "description": "Top-left Y (0-1)"},
						"w": map[string]interface{}{"type": "number", "description": "Width (0-1)"},
						"h": map[string]interface{}{"type": "number", "description": "Height (0-1)"},
					},
					Required: []string{"n", "x", "y", "w", "h"},
				},
			},
		},
		{
			OfTool: &anthropic.ToolParam{
				Name:        "add_door",
				Description: anthropic.String("Adds a door to a specific position."),
				InputSchema: anthropic.ToolInputSchemaParam{
					Type: "object",
					Properties: map[string]interface{}{
						"p": map[string]interface{}{
							"type": "array",
							"minItems": 2,
							"maxItems": 2,
							"items": map[string]interface{}{"type": "number"},
							"description": "[x, y] center position.",
						},
						"rot": map[string]interface{}{"type": "number", "description": "Rotation (0, 90, 180, 270)"},
					},
					Required: []string{"p", "rot"},
				},
			},
		},
		{
			OfTool: &anthropic.ToolParam{
				Name:        "add_stair",
				Description: anthropic.String("Adds a staircase."),
				InputSchema: anthropic.ToolInputSchemaParam{
					Type: "object",
					Properties: map[string]interface{}{
						"p": map[string]interface{}{
							"type": "array",
							"minItems": 2,
							"maxItems": 2,
							"items": map[string]interface{}{"type": "number"},
						},
						"w":   map[string]interface{}{"type": "number", "description": "Width"},
						"l":   map[string]interface{}{"type": "number", "description": "Length"},
						"t":   map[string]interface{}{"type": "string", "enum": []string{"straight", "l-shape", "u-shape", "circular", "arched"}},
						"s":   map[string]interface{}{"type": "integer", "description": "Steps"},
						"rot": map[string]interface{}{"type": "number", "description": "Rotation"},
					},
					Required: []string{"p", "w", "l", "t", "s", "rot"},
				},
			},
		},
		{
			OfTool: &anthropic.ToolParam{
				Name:        "set_metadata",
				Description: anthropic.String("Sets global project metadata."),
				InputSchema: anthropic.ToolInputSchemaParam{
					Type: "object",
					Properties: map[string]interface{}{
						"n": map[string]interface{}{"type": "string", "description": "Project name"},
					},
					Required: []string{"n"},
				},
			},
		},
	}
}

// GetAnalystToolDefinition returns the tool schema for the Vision Analyst Agent
func GetAnalystToolDefinition() anthropic.ToolUnionParam {
	return anthropic.ToolUnionParam{
		OfTool: &anthropic.ToolParam{
			Name:        "record_analyst_report",
			Description: anthropic.String("Records the semantic analysis of the floor plan. Call this immediately after your chain of thought to provide the structured output. You must call this tool once."),
			InputSchema: anthropic.ToolInputSchemaParam{
				Type: "object",
				Properties: map[string]interface{}{
					"thought_process": map[string]interface{}{
						"type":        "string",
						"description": "Your detailed reasoning process isolating structural walls from noise.",
					},
					"scale_anchor": map[string]interface{}{
						"type": "object",
						"properties": map[string]interface{}{
							"reference":       map[string]interface{}{"type": "string"},
							"estimated_ratio": map[string]interface{}{"type": "string"},
						},
						"required": []string{"reference", "estimated_ratio"},
					},
					"environments": map[string]interface{}{
						"type": "array",
						"items": map[string]interface{}{
							"type": "object",
							"properties": map[string]interface{}{
								"name":              map[string]interface{}{"type": "string"},
								"shape_description": map[string]interface{}{"type": "string"},
								"connected_to":      map[string]interface{}{"type": "array", "items": map[string]interface{}{"type": "string"}},
							},
							"required": []string{"name", "shape_description", "connected_to"},
						},
					},
					"noise_detected": map[string]interface{}{
						"type":  "array",
						"items": map[string]interface{}{"type": "string"},
					},
				},
				Required: []string{"thought_process", "scale_anchor", "environments", "noise_detected"},
			},
		},
	}
}
