package geometry

import (
	"math"
)

const (
	SnapThreshold = 0.005
)

type Sanitizer struct {
	SnapPoints []Point
}

func NewSanitizer() *Sanitizer {
	return &Sanitizer{
		SnapPoints: []Point{},
	}
}

func (s *Sanitizer) SanitizeRoom(room *Room) {
	if len(room.Vertices) < 3 && room.Type == "polygon" {
		return
	}

	for i := range room.Vertices {
		room.Vertices[i].X = round(room.Vertices[i].X, 4)
		room.Vertices[i].Y = round(room.Vertices[i].Y, 4)
	}

	if room.Type == "polygon" || len(room.Vertices) > 2 {
		first := room.Vertices[0]
		last := room.Vertices[len(room.Vertices)-1]

		if dist(first, last) > 0.001 {
			room.Vertices = append(room.Vertices, first)
		} else {
			room.Vertices[len(room.Vertices)-1] = first
		}
	}

	for i := range room.Vertices {
		room.Vertices[i] = s.snapPoint(room.Vertices[i])
	}
}
func (s *Sanitizer) snapPoint(p Point) Point {
	for _, anchor := range s.SnapPoints {
		if dist(p, anchor) < SnapThreshold {
			return anchor
		}
	}
	s.SnapPoints = append(s.SnapPoints, p)
	return p
}

func dist(p1, p2 Point) float64 {
	return math.Sqrt(math.Pow(p1.X-p2.X, 2) + math.Pow(p1.Y-p2.Y, 2))
}

func round(val float64, precision int) float64 {
	p := math.Pow(10, float64(precision))
	return math.Round(val*p) / p
}
