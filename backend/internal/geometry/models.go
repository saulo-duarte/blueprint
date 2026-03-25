package geometry

import (
	"encoding/json"
	"fmt"
)

type Point struct {
	X float64 `json:"x" validate:"required,min=0,max=1"`
	Y float64 `json:"y" validate:"required,min=0,max=1"`
}

func (p *Point) UnmarshalJSON(data []byte) error {
	// Try unmarshalling as a struct first
	type alias Point
	var s alias
	if err := json.Unmarshal(data, &s); err == nil && (s.X != 0 || s.Y != 0) {
		*p = Point(s)
		return nil
	}

	// Fallback to array unmarshalling
	var a []float64
	if err := json.Unmarshal(data, &a); err != nil {
		return err
	}
	if len(a) < 2 {
		return fmt.Errorf("invalid point: expected at least 2 elements, got %d", len(a))
	}
	p.X = a[0]
	p.Y = a[1]
	return nil
}

type Room struct {
	ID       string  `json:"id"`
	Name     string  `json:"n"`
	Type     string  `json:"t"`
	Vertices []Point `json:"pts,omitempty"`
	X        float64 `json:"x,omitempty"`
	Y        float64 `json:"y,omitempty"`
	W        float64 `json:"w,omitempty"`
	H        float64 `json:"h,omitempty"`
	Color    string  `json:"c,omitempty"`
}

type Door struct {
	ID           string  `json:"id"`
	WallID       string  `json:"wall_id,omitempty"`
	PositionNorm float64 `json:"position_norm,omitempty"`
	X            float64 `json:"x,omitempty"`
	Y            float64 `json:"y,omitempty"`
	P            []float64 `json:"p,omitempty"` // [x, y]
	Rotation     float64 `json:"rot"`
}

type Stair struct {
	ID       string  `json:"id"`
	X        float64 `json:"x,omitempty"`
	Y        float64 `json:"y,omitempty"`
	P        []float64 `json:"p,omitempty"` // [x, y]
	Width    float64 `json:"w"`
	Length   float64 `json:"l"`
	Type     string  `json:"t"`
	Steps    int     `json:"s"`
	Rotation float64 `json:"rot"`
}

type AIResponse struct {
	ID          string   `json:"id"`
	ProjectName string   `json:"n"`
	Rooms       []Room   `json:"rooms"`
	Doors       []Door   `json:"doors"`
	Stairs      []Stair  `json:"stairs,omitempty"`
	Errors      []string `json:"errors,omitempty"`
}
