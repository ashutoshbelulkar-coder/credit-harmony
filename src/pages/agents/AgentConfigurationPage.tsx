import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft, Plus, Trash2, Brain, Eye, Sparkles,
} from "lucide-react";
import { mockAgents } from "@/data/agents-mock";
import { cn } from "@/lib/utils";

const defaultCapabilities = {
  fileCreation: false,
  imageCreation: false,
  videoCreation: false,
  dataAnalysis: true,
  riskScoring: true,
  financialSpreading: false,
  reportGeneration: true,
};

const defaultSources = {
  creditBureau: true,
  bankStatement: false,
  gstData: false,
  ocrDocument: false,
  fraudSignals: false,
  internalPortfolio: false,
  telecomUtility: false,
};

const availableTools = [
  { id: "bureau-enquiry", name: "Bureau Enquiry" },
  { id: "bank-upload", name: "Bank Upload" },
  { id: "gst-fetch", name: "GST Fetch" },
  { id: "fraud-check", name: "Fraud Check" },
  { id: "risk-simulation", name: "Risk Simulation" },
];

export default function AgentConfigurationPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("details");

  // Details
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [template, setTemplate] = useState("");

  // Knowledge
  const [sources, setSources] = useState(defaultSources);

  // Capabilities
  const [capabilities, setCapabilities] = useState(defaultCapabilities);

  // Tools
  const [selectedTools, setSelectedTools] = useState<string[]>(["bureau-enquiry"]);
  const [customTools, setCustomTools] = useState<{ name: string; description: string }[]>([]);

  // Suggested Prompts
  const [prompts, setPrompts] = useState<{ title: string; message: string }[]>([]);

  // GenAI Model
  const [model, setModel] = useState("gpt-enterprise");
  const [temperature, setTemperature] = useState([0.3]);
  const [maxTokens, setMaxTokens] = useState("4096");

  const handleTemplateSelect = (val: string) => {
    setTemplate(val);
    const agent = mockAgents.find((a) => a.id === val);
    if (agent) {
      setName(agent.name);
      setDescription(agent.description);
      setInstructions(agent.instructions);
      setSources(agent.sources as any);
      setCapabilities(agent.capabilities as any);
    }
  };

  const handleCreate = () => {
    if (!name.trim()) {
      toast({ title: "Validation Error", description: "Agent name is required.", variant: "destructive" });
      return;
    }
    toast({ title: "Agent Created", description: `"${name}" has been added to the agent directory.` });
    navigate("/agents");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/agents")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-h2 font-semibold text-foreground">Create Agent</h1>
            <p className="text-caption text-muted-foreground">Configure a new AI agent for your institution</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 shrink-0">
          <Button variant="outline" onClick={() => navigate("/agents")}>Cancel</Button>
          <Button onClick={handleCreate} className="gap-1.5">
            <Plus className="w-4 h-4" /> Create Agent
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
        <TabsList className="flex w-full min-w-0 sm:w-fit shrink-0 flex-nowrap gap-1 sm:overflow-visible overflow-y-hidden scroll-touch-x px-3 sm:px-1">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
          <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
          <TabsTrigger value="prompts">Prompts</TabsTrigger>
          <TabsTrigger value="model">GenAI Model</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 mt-4">
          <div className="max-w-3xl pb-24">
            {/* DETAILS */}
            <TabsContent value="details" className="mt-0 space-y-6">
              <Card className="border border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-body font-semibold">Agent Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Template (Optional)</Label>
                    <Select value={template} onValueChange={handleTemplateSelect}>
                      <SelectTrigger><SelectValue placeholder="Select a template to pre-populate..." /></SelectTrigger>
                      <SelectContent>
                        {mockAgents.map((a) => (
                          <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Agent Name *</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., SME Underwriting Agent" className="text-base sm:text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Description</Label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of what this agent does..." rows={3} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Instructions</Label>
                    <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="System instructions for the AI agent..." rows={6} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* KNOWLEDGE */}
            <TabsContent value="knowledge" className="mt-0 space-y-6">
              <Card className="border border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-body font-semibold">Knowledge Sources</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(sources).map(([key, enabled]) => (
                    <div key={key} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <Label className="text-body font-medium text-foreground capitalize cursor-pointer">
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </Label>
                      <Switch checked={enabled} onCheckedChange={() => setSources((s) => ({ ...s, [key]: !s[key] }))} />
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="gap-1 mt-2">
                    <Plus className="w-3.5 h-3.5" /> Add Data Source
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* CAPABILITIES */}
            <TabsContent value="capabilities" className="mt-0 space-y-6">
              <Card className="border border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-body font-semibold">Agent Capabilities</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(capabilities).map(([key, enabled]) => (
                    <div key={key} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <Label className="text-body font-medium text-foreground capitalize cursor-pointer">
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </Label>
                      <Switch checked={enabled} onCheckedChange={() => setCapabilities((c) => ({ ...c, [key]: !c[key] }))} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TOOLS */}
            <TabsContent value="tools" className="mt-0 space-y-6">
              <Card className="border border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-body font-semibold">Available Tools</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {availableTools.map((tool) => (
                    <div key={tool.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <Checkbox
                        checked={selectedTools.includes(tool.id)}
                        onCheckedChange={(checked) => {
                          setSelectedTools((prev) =>
                            checked ? [...prev, tool.id] : prev.filter((t) => t !== tool.id)
                          );
                        }}
                      />
                      <Label className="text-body font-medium text-foreground cursor-pointer">{tool.name}</Label>
                    </div>
                  ))}

                  {customTools.map((ct, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                      <Checkbox checked />
                      <div className="flex-1">
                        <p className="text-body font-medium text-foreground">{ct.name}</p>
                        <p className="text-[10px] text-muted-foreground">{ct.description}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setCustomTools((c) => c.filter((_, idx) => idx !== i))}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 mt-2"
                    onClick={() => setCustomTools((c) => [...c, { name: "Custom Tool", description: "Description" }])}
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Custom Tool
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* SUGGESTED PROMPTS */}
            <TabsContent value="prompts" className="mt-0 space-y-6">
              <Card className="border border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-body font-semibold">Suggested Prompts</CardTitle>
                  <p className="text-caption text-muted-foreground">These appear as recommendation cards when the agent loads.</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {prompts.map((p, i) => (
                    <div key={i} className="flex items-start gap-2 p-3 rounded-lg border border-border">
                      <div className="flex-1 space-y-2">
                        <Input
                          value={p.title}
                          onChange={(e) => setPrompts((ps) => ps.map((pp, idx) => idx === i ? { ...pp, title: e.target.value } : pp))}
                          placeholder="Title"
                          className="text-base sm:text-sm"
                        />
                        <Textarea
                          value={p.message}
                          onChange={(e) => setPrompts((ps) => ps.map((pp, idx) => idx === i ? { ...pp, message: e.target.value } : pp))}
                          placeholder="Message content..."
                          rows={2}
                        />
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setPrompts((ps) => ps.filter((_, idx) => idx !== i))}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => setPrompts((ps) => [...ps, { title: "", message: "" }])}>
                    <Plus className="w-3.5 h-3.5" /> Add Prompt
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* GENAI MODEL */}
            <TabsContent value="model" className="mt-0 space-y-6">
              <Card className="border border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-body font-semibold">GenAI Model Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-1.5">
                    <Label>Model</Label>
                    <Select value={model} onValueChange={setModel}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-enterprise">GPT Enterprise</SelectItem>
                        <SelectItem value="lightweight">Lightweight Model</SelectItem>
                        <SelectItem value="risk-optimized">Risk-Optimized Model</SelectItem>
                        <SelectItem value="custom">Custom Endpoint</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Temperature</Label>
                      <span className="text-caption text-muted-foreground">{temperature[0]}</span>
                    </div>
                    <Slider value={temperature} onValueChange={setTemperature} min={0} max={1} step={0.1} className="w-full" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Max Tokens</Label>
                    <Input value={maxTokens} onChange={(e) => setMaxTokens(e.target.value)} type="number" className="text-base sm:text-sm" />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* PREVIEW */}
            <TabsContent value="preview" className="mt-0 space-y-6">
              <Card className="border border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-body font-semibold flex items-center gap-2">
                    <Eye className="w-4 h-4" /> Agent Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center">
                      <Brain className="w-6 h-6 text-secondary" />
                    </div>
                    <div>
                      <h3 className="text-body font-semibold text-foreground">{name || "Untitled Agent"}</h3>
                      <p className="text-caption text-muted-foreground">{description || "No description provided"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Enabled Sources</p>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(sources).filter(([, v]) => v).map(([k]) => (
                          <Badge key={k} variant="secondary" className="text-[9px] capitalize">
                            {k.replace(/([A-Z])/g, " $1").trim()}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Capabilities</p>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(capabilities).filter(([, v]) => v).map(([k]) => (
                          <Badge key={k} variant="outline" className="text-[9px] capitalize">
                            {k.replace(/([A-Z])/g, " $1").trim()}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Tools</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedTools.map((t) => (
                          <Badge key={t} variant="secondary" className="text-[9px]">{t.replace(/-/g, " ")}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Model</p>
                      <Badge variant="outline" className="text-[9px]">{model} · temp {temperature[0]}</Badge>
                    </div>
                  </div>

                  {prompts.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Suggested Prompts</p>
                      <div className="flex flex-wrap gap-2">
                        {prompts.map((p, i) => (
                          <Badge key={i} variant="secondary" className="text-[9px]">
                            <Sparkles className="w-3 h-3 mr-1" /> {p.title || "Untitled"}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button variant="outline" className="gap-1.5 w-full">
                    <Brain className="w-4 h-4" /> Test Agent
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
