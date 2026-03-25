package geometry

type Point struct {
	X float64 `json:"x" validate:"required,min=0,max=1"`
	Y float64 `json:"y" validate:"required,min=0,max=1"`
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
