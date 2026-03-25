package vision

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/option"
)

type Client struct {
	Anthropic *anthropic.Client
}

func NewClient() *Client {
	apiKey := os.Getenv("ANTHROPIC_API_KEY")
	client := anthropic.NewClient(
		option.WithAPIKey(apiKey),
	)
	return &Client{
		Anthropic: &client,
	}
}

func (c *Client) ProcessFloorplan(ctx context.Context, imageData []byte, mimeType string, analystReport *AnalystReport, refinementPrompt string) (*anthropic.Message, error) {
	tools := GetToolDefinitions()

	// Convert mimeType to SDK constant
	var mediaType anthropic.Base64ImageSourceMediaType
	switch mimeType {
	case "image/jpeg":
		mediaType = anthropic.Base64ImageSourceMediaTypeImageJPEG
	case "image/png":
		mediaType = anthropic.Base64ImageSourceMediaTypeImagePNG
	case "image/gif":
		mediaType = anthropic.Base64ImageSourceMediaTypeImageGIF
	case "image/webp":
		mediaType = anthropic.Base64ImageSourceMediaTypeImageWebP
	default:
		mediaType = anthropic.Base64ImageSourceMediaTypeImageJPEG
	}

	// Load Few-Shot Examples (Golden Dataset)
	examples := c.loadFewShotExamples()

	messages := []anthropic.MessageParam{}
	
	// Inject Examples
	for _, ex := range examples {
		messages = append(messages, anthropic.NewUserMessage(
			anthropic.ContentBlockParamUnion{
				OfImage: &anthropic.ImageBlockParam{
					Type: "image",
					Source: anthropic.ImageBlockParamSourceUnion{
						OfBase64: &anthropic.Base64ImageSourceParam{
							Type:      "base64",
							MediaType: mediaType, // Assuming same media type for simplicity or detect per file
							Data:      ex.ImageBase64,
						},
					},
				},
			},
			anthropic.ContentBlockParamUnion{
				OfText: &anthropic.TextBlockParam{
					Type: "text",
					Text: "Analyze this floor plan image and use the provided tools to map the rooms and doors.",
				},
			},
		))

		// Assistant response (Tool Calls)
		toolCalls := []anthropic.ContentBlockParamUnion{}
		for _, tc := range ex.ToolInvocations {
			toolCalls = append(toolCalls, anthropic.ContentBlockParamUnion{
				OfToolUse: &anthropic.ToolUseBlockParam{
					Type:  "tool_use",
					ID:    tc.ID,
					Name:  tc.Name,
					Input: tc.Input,
				},
			})
		}
		
		// Apply cache control to the last block of the last example
		if len(toolCalls) > 0 {
			lastIdx := len(toolCalls) - 1
			toolCalls[lastIdx].OfToolUse.CacheControl = anthropic.CacheControlEphemeralParam{
				Type: "ephemeral",
			}
		}

		messages = append(messages, anthropic.NewAssistantMessage(toolCalls...))

		// ADDED: Every tool_use NEEDS a tool_result in the next User message
		results := []anthropic.ContentBlockParamUnion{}
		for _, tc := range ex.ToolInvocations {
			results = append(results, anthropic.NewToolResultBlock(
				tc.ID,
				"Element added successfully",
				false,
			))
		}
		messages = append(messages, anthropic.NewUserMessage(results...))
	}

	refinementContext := ""
	if refinementPrompt != "" {
		refinementContext = fmt.Sprintf(`
### REFINEMENT INSTRUCTIONS ###
The user provided the following feedback on the CURRENT mapping (which is overlaid on the image):
"%s"

The image provided is a screenshot of the current mapping (purple boxes) on top of the original floor plan. 
Your task is to REDO the mapping, correcting any defects. 
Common defects to look for in the current overlay:
- Noise: Boxes over text, logos, or furniture that are not rooms.
- Alignment: Boxes not perfectly aligned with structural walls.
- Gaps/Overlaps: Adjacent rooms with gaps or overlapping areas.
- Missing Elements: Areas identified by the analyst but not mapped.

Perform a step-by-step THINKING process to identify these defects inside the text block, and then IMMEDIATELY call ALL the tools necessary to provide the full, corrected mapping in a single response. Do not stop after calling one tool.
`, refinementPrompt)
	}

	reportJSON, _ := json.MarshalIndent(analystReport, "", "  ")
	prompt := fmt.Sprintf(`Analyze this floor plan image and use the provided tools to map the rooms and doors. Round coordinates to 3 decimal places. Ensure all rooms are accounted for.
%s
=== CRITICAL CONTEXT FROM SEMANTIC ANALYST ===
%s
==============================================
Base your structural mapping STRICTLY on the analyst's findings above. Ignore noise and respect the anchor scale.`, refinementContext, string(reportJSON))

	// The actual user session message
	messages = append(messages, anthropic.NewUserMessage(
		anthropic.ContentBlockParamUnion{
			OfImage: &anthropic.ImageBlockParam{
				Type: "image",
				Source: anthropic.ImageBlockParamSourceUnion{
					OfBase64: &anthropic.Base64ImageSourceParam{
						Type:      "base64",
						MediaType: mediaType,
						Data:      base64.StdEncoding.EncodeToString(imageData),
					},
				},
			},
		},
		anthropic.ContentBlockParamUnion{
			OfText: &anthropic.TextBlockParam{
				Type: "text",
				Text: prompt,
			},
		},
	))

	params := anthropic.MessageNewParams{
		Model:     anthropic.Model("claude-sonnet-4-6"),
		MaxTokens: 4096,
		Tools:     tools,
		Messages:  messages,
	}

	return c.Anthropic.Messages.New(ctx, params)
}

type fewShotExample struct {
	ImageBase64    string
	ToolInvocations []toolInvocation
}

type toolInvocation struct {
	ID    string
	Name  string
	Input json.RawMessage
}

func (c *Client) loadFewShotExamples() []fewShotExample {
	examples := []fewShotExample{}
	basePath := "assets/dataset"

	files, err := os.ReadDir(basePath)
	if err != nil {
		return examples
	}

	for _, f := range files {
		if !f.IsDir() && filepath.Ext(f.Name()) == ".json" {
			baseName := f.Name()[:len(f.Name())-len(filepath.Ext(f.Name()))]
			pngPath := filepath.Join(basePath, baseName+".png")
			jsonPath := filepath.Join(basePath, f.Name())

			imgData, err := os.ReadFile(pngPath)
			if err != nil {
				continue
			}

			jsonData, err := os.ReadFile(jsonPath)
			if err != nil {
				continue
			}

			var rawMap map[string]interface{}
			if err := json.Unmarshal(jsonData, &rawMap); err != nil {
				continue
			}

			invocations := []toolInvocation{}
			// Rooms
			if rooms, ok := rawMap["rooms"].([]interface{}); ok {
				for i, r := range rooms {
					input, _ := json.Marshal(r)
					invocations = append(invocations, toolInvocation{
						ID:    fmt.Sprintf("ex-%s-room-%d", baseName, i),
						Name:  "add_room_polygon",
						Input: input,
					})
				}
			}
			// Doors
			if doors, ok := rawMap["doors"].([]interface{}); ok {
				for i, d := range doors {
					input, _ := json.Marshal(d)
					invocations = append(invocations, toolInvocation{
						ID:    fmt.Sprintf("ex-%s-door-%d", baseName, i),
						Name:  "add_door",
						Input: input,
					})
				}
			}
			// Stairs
			if stairs, ok := rawMap["stairs"].([]interface{}); ok {
				for i, s := range stairs {
					input, _ := json.Marshal(s)
					invocations = append(invocations, toolInvocation{
						ID:    fmt.Sprintf("ex-%s-stair-%d", baseName, i),
						Name:  "add_stair",
						Input: input,
					})
				}
			}

			examples = append(examples, fewShotExample{
				ImageBase64:     base64.StdEncoding.EncodeToString(imgData),
				ToolInvocations: invocations,
			})
		}
	}

	return examples
}

func (c *Client) AnalyzeFloorPlan(ctx context.Context, imageData []byte, mimeType string, width, height int, refinementPrompt string) (*AnalystReport, error) {
	// ... (AnalyzeFloorPlan logic remains essentially same, but we could also add few-shot here if needed)
	// For now, let's just keep it as is to focus on the Builder Agent training.
	
	// Convert mimeType to SDK constant
	var mediaType anthropic.Base64ImageSourceMediaType
	switch mimeType {
	case "image/jpeg":
		mediaType = anthropic.Base64ImageSourceMediaTypeImageJPEG
	case "image/png":
		mediaType = anthropic.Base64ImageSourceMediaTypeImagePNG
	case "image/gif":
		mediaType = anthropic.Base64ImageSourceMediaTypeImageGIF
	case "image/webp":
		mediaType = anthropic.Base64ImageSourceMediaTypeImageWebP
	default:
		mediaType = anthropic.Base64ImageSourceMediaTypeImageJPEG
	}

	refinementContext := ""
	if refinementPrompt != "" {
		refinementContext = fmt.Sprintf("\n\nREFINEMENT FEEDBACK: O usuário reportou problemas no mapeamento atual: \"%s\". Re-avalie os ambientes considerando este feedback.", refinementPrompt)
	}

	prompt := fmt.Sprintf(`A imagem original possui %dx%d pixels. 
Analise a imagem da planta baixa passo a passo, identificando paredes reais estruturais (linhas grossas sólidas fechadas), portas e escadas, descartando ruídos como cotas de medidas ou móveis.%s
Depois, chame a ferramenta 'record_analyst_report' para registrar seu relatório estruturado. Mantenha a política de Zero-Pixel (use 0.0 a 1.0) nas descrições de posição.`, width, height, refinementContext)

	params := anthropic.MessageNewParams{
		Model:     anthropic.Model("claude-sonnet-4-6"),
		MaxTokens: 4096,
		Tools:     []anthropic.ToolUnionParam{GetAnalystToolDefinition()},
		ToolChoice: anthropic.ToolChoiceUnionParam{
			OfTool: &anthropic.ToolChoiceToolParam{
				Type:     "tool",
				Name:     "record_analyst_report",
			},
		},
		Messages: []anthropic.MessageParam{
			anthropic.NewUserMessage(
				anthropic.ContentBlockParamUnion{
					OfImage: &anthropic.ImageBlockParam{
						Type: "image",
						Source: anthropic.ImageBlockParamSourceUnion{
							OfBase64: &anthropic.Base64ImageSourceParam{
								Type:      "base64",
								MediaType: mediaType,
								Data:      base64.StdEncoding.EncodeToString(imageData),
							},
						},
					},
				},
				anthropic.ContentBlockParamUnion{
					OfText: &anthropic.TextBlockParam{
						Type: "text",
						Text: prompt,
					},
				},
			),
		},
	}

	msg, err := c.Anthropic.Messages.New(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("failed to call Analyst Agent: %w", err)
	}

	// Extract tool use input
	for _, block := range msg.Content {
		if block.Type == "tool_use" && block.Name == "record_analyst_report" {
			var report AnalystReport
			if err := json.Unmarshal(block.Input, &report); err != nil {
				return nil, fmt.Errorf("failed to parse analyst report: %w", err)
			}
			return &report, nil
		}
	}

	return nil, fmt.Errorf("tool 'record_analyst_report' was not called by the model")
}
