package api

import (
	"github.com/blueprint/backend/internal/api/handlers"
	"github.com/blueprint/backend/internal/vision"
	"github.com/gofiber/fiber/v2"
)

func RegisterRoutes(app *fiber.App) {
	visionClient := vision.NewClient()

	visionHandler := handlers.NewVisionHandler(visionClient)

	api := app.Group("/api/v1")

	api.Post("/vision/map-floorplan", visionHandler.MapFloorplan)
	api.Post("/vision/map-floorplan-async", visionHandler.MapFloorplanAsync)
	api.Get("/vision/tasks/:id", visionHandler.GetTaskStatus)
	api.Get("/projects", visionHandler.ListProjects)
	api.Get("/projects/:id", visionHandler.GetProject)
}
