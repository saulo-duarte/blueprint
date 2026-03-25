package vision

// AnalystReport represents the structured semantic output from the Vision Analyst Agent.
type AnalystReport struct {
	ThoughtProcess string        `json:"thought_process"`
	ScaleAnchor    ScaleAnchor   `json:"scale_anchor"`
	Environments   []Environment `json:"environments"`
	NoiseDetected  []string      `json:"noise_detected"`
}

// ScaleAnchor provides spatial context based on dimensions or long walls.
type ScaleAnchor struct {
	Reference      string `json:"reference"`
	EstimatedRatio string `json:"estimated_ratio"`
}

// Environment represents a single structural room identified by the analyst.
type Environment struct {
	Name             string   `json:"name"`
	ShapeDescription string   `json:"shape_description"`
	ConnectedTo      []string `json:"connected_to"`
}
