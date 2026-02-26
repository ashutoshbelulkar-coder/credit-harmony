import { useState, useRef, useEffect, useCallback } from "react";
import type { Agent, Customer, ChatMessage } from "@/types/agents";
import { generateMockCustomer, generateBureauResponse } from "@/data/agents-mock";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft, Send, Paperclip, Search, Upload, FileText, ShieldAlert,
  BarChart3, GitBranch, Brain, RefreshCw, Download, ChevronDown,
  ChevronRight, AlertTriangle, FileCheck, CreditCard, TrendingUp,
  Activity, Calendar, DollarSign, PiggyBank, Wallet, BadgePercent,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BureauEnquiryModal } from "./BureauEnquiryModal";
import { CustomerContextPanel } from "./CustomerContextPanel";
import { SourcesConfigTab } from "./SourcesConfigTab";

const toolIcons: Record<string, React.ElementType> = {
  "bureau-enquiry": Search,
  "bank-upload": Upload,
  "gst-fetch": FileText,
  "fraud-check": ShieldAlert,
  "risk-simulation": BarChart3,
  "tradeline-sim": GitBranch,
};

interface Props {
  agent: Agent;
  subAgentId: string;
  onBack: () => void;
}

export function AgentChatWorkspace({ agent, subAgentId, onBack }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "agent",
      content: `Welcome to **${agent.name}** workspace. I'm ready to assist you with credit analysis. Use the recommended tools below or type your query to get started.`,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [showBureauModal, setShowBureauModal] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [sources, setSources] = useState<Record<string, boolean>>(agent.sources);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(() => {
    if (!inputValue.trim()) return;
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");

    // Simulate agent response
    setTimeout(() => {
      const agentMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "agent",
        content: `I've analyzed your query. To provide a comprehensive assessment, I recommend starting with a **Bureau Enquiry** to pull the customer's credit profile. This will give us the foundation for further analysis.\n\nWould you like me to proceed with any specific tool?`,
        timestamp: new Date().toISOString(),
        actions: [
          { label: "Bureau Enquiry", toolId: "bureau-enquiry" },
          { label: "Upload Bank Statement", toolId: "bank-upload" },
          { label: "Run Fraud Check", toolId: "fraud-check" },
        ],
      };
      setMessages((prev) => [...prev, agentMsg]);
    }, 800);
  }, [inputValue]);

  const handleToolClick = useCallback((toolId: string) => {
    if (toolId === "bureau-enquiry") {
      setShowBureauModal(true);
    } else {
      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "user",
        content: `Execute tool: ${toolId}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setTimeout(() => {
        const agentMsg: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          role: "agent",
          content: `The **${toolId.replace(/-/g, " ")}** tool is being configured. This feature will be available in the next release. In the meantime, you can use **Bureau Enquiry** to pull comprehensive credit data.`,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, agentMsg]);
      }, 600);
    }
  }, []);

  const handleBureauSubmit = useCallback((form: { fullName: string; pan: string; mobile: string; dob: string; address: string }) => {
    setShowBureauModal(false);

    // System message
    const systemMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "system",
      content: `Bureau enquiry initiated for **${form.fullName}** (PAN: ${form.pan})`,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, systemMsg]);

    // Create customer
    setTimeout(() => {
      const cust = generateMockCustomer(form);
      setCustomer(cust);

      // Generate bureau response
      const bureauMsg = generateBureauResponse(cust);
      setMessages((prev) => [...prev, bureauMsg]);
    }, 1200);
  }, []);

  const recommendedTools = agent.tools.length > 0
    ? agent.tools.filter((t) => sources[Object.keys(sources).find((k) => t.id.includes(k.replace(/([A-Z])/g, "-$1").toLowerCase())) || ""] !== false || true).slice(0, 6)
    : [
        { id: "bureau-enquiry", name: "Bureau Enquiry", description: "Pull credit bureau report", icon: "Search" },
        { id: "bank-upload", name: "Upload Bank Statement", description: "Analyze bank statement", icon: "Upload" },
        { id: "gst-fetch", name: "Fetch GST Data", description: "Retrieve GST filing data", icon: "FileText" },
        { id: "fraud-check", name: "Fraud Check", description: "Run fraud detection", icon: "ShieldAlert" },
        { id: "risk-simulation", name: "Risk Simulation", description: "Simulate risk scenarios", icon: "BarChart3" },
        { id: "tradeline-sim", name: "What-if Simulation", description: "Model trade line impact", icon: "GitBranch" },
      ];

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Brain className="w-5 h-5 text-secondary shrink-0" />
          <h2 className="text-body font-semibold text-foreground truncate">{agent.name}</h2>
          <Badge variant="outline" className="border-success/40 text-success bg-success/10 text-[9px] uppercase font-semibold tracking-wider shrink-0 hidden sm:flex">
            ● Online
          </Badge>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" className="gap-1 text-caption">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Button variant="ghost" size="sm" className="gap-1 text-caption">
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
        </div>
      </div>

      {/* Main split */}
      <div className="flex flex-1 min-h-0 gap-0 mt-4">
        {/* Left - Customer Context */}
        <div className="hidden lg:flex w-[40%] border-r border-border pr-4 flex-col min-h-0">
          <CustomerContextPanel customer={customer} />
        </div>

        {/* Right - Chat */}
        <div className="flex-1 flex flex-col min-h-0 lg:pl-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
            <TabsList className="w-fit shrink-0">
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="sources">Sources</TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="flex-1 flex flex-col min-h-0 mt-3">
              {/* Messages */}
              <ScrollArea className="flex-1 min-h-0">
                <div className="space-y-4 pr-2 pb-4">
                  {messages.map((msg) => (
                    <ChatBubble key={msg.id} message={msg} onToolClick={handleToolClick} />
                  ))}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>

              {/* Recommended tools */}
              <div className="shrink-0 py-3 border-t border-border">
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {recommendedTools.map((tool) => {
                    const TIcon = toolIcons[tool.id] || Brain;
                    return (
                      <button
                        key={tool.id}
                        onClick={() => handleToolClick(tool.id)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted hover:border-secondary/30 transition-all duration-200 shrink-0"
                      >
                        <TIcon className="w-4 h-4 text-secondary" />
                        <div className="text-left">
                          <div className="text-caption font-medium text-foreground whitespace-nowrap">{tool.name}</div>
                          <div className="text-[9px] text-muted-foreground whitespace-nowrap">{tool.description}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Input */}
              <div className="shrink-0 flex gap-2 items-center">
                <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground">
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Type your message..."
                  className="flex-1 text-base sm:text-sm"
                />
                <Button size="icon" onClick={handleSend} disabled={!inputValue.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="sources" className="flex-1 min-h-0 mt-3">
              <SourcesConfigTab sources={sources} onToggle={(key) => setSources((s) => ({ ...s, [key]: !s[key] }))} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Bureau Enquiry Modal */}
      <BureauEnquiryModal
        open={showBureauModal}
        onClose={() => setShowBureauModal(false)}
        onSubmit={handleBureauSubmit}
      />
    </div>
  );
}

function ChatBubble({ message, onToolClick }: { message: ChatMessage; onToolClick: (id: string) => void }) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="px-3 py-1.5 rounded-full bg-muted text-caption text-muted-foreground">
          {message.content.replace(/\*\*/g, "")} · {time}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex gap-2", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-secondary/10 flex items-center justify-center shrink-0 mt-1">
          <Brain className="w-4 h-4 text-secondary" />
        </div>
      )}
      <div className={cn("max-w-[85%] space-y-2", isUser && "items-end")}>
        <div
          className={cn(
            "rounded-lg px-4 py-3 text-body",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-card border border-border text-foreground"
          )}
        >
          <SimpleMarkdown text={message.content} />
        </div>
        {message.actions && message.actions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.actions.map((action) => (
              <Button
                key={action.toolId}
                variant="outline"
                size="sm"
                className="text-caption gap-1 h-7"
                onClick={() => onToolClick(action.toolId)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
        <span className="text-[9px] text-muted-foreground">{time}</span>
      </div>
    </div>
  );
}

function SimpleMarkdown({ text }: { text: string }) {
  // Very basic markdown rendering for bold, headers, tables, bullet points
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let inTable = false;
  let tableRows: string[][] = [];

  const renderInline = (line: string) => {
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const flushTable = () => {
    if (tableRows.length > 0) {
      elements.push(
        <div key={`table-${elements.length}`} className="overflow-x-auto my-2">
          <table className="w-full text-caption border-collapse">
            <thead>
              <tr>
                {tableRows[0]?.map((h, i) => (
                  <th key={i} className="border-b border-border px-2 py-1 text-left font-semibold text-muted-foreground">{h.trim()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.slice(2).map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="border-b border-border/50 px-2 py-1">{renderInline(cell.trim())}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
    }
  };

  lines.forEach((line, idx) => {
    if (line.startsWith("|")) {
      inTable = true;
      tableRows.push(line.split("|").filter(Boolean));
      return;
    }
    if (inTable) {
      flushTable();
      inTable = false;
    }
    if (line.startsWith("### ")) {
      elements.push(<h4 key={idx} className="font-semibold text-body mt-3 mb-1">{renderInline(line.slice(4))}</h4>);
    } else if (line.startsWith("## ")) {
      elements.push(<h3 key={idx} className="font-semibold text-body mt-3 mb-1">{renderInline(line.slice(3))}</h3>);
    } else if (line.startsWith("---")) {
      elements.push(<hr key={idx} className="border-border my-2" />);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(<div key={idx} className="flex gap-1.5 ml-1"><span className="text-muted-foreground">•</span><span>{renderInline(line.slice(2))}</span></div>);
    } else if (line.startsWith("✅") || line.startsWith("⚠️")) {
      elements.push(<p key={idx}>{renderInline(line)}</p>);
    } else if (line.trim() === "") {
      elements.push(<div key={idx} className="h-1" />);
    } else {
      elements.push(<p key={idx}>{renderInline(line)}</p>);
    }
  });
  if (inTable) flushTable();

  return <div className="space-y-0.5 leading-relaxed">{elements}</div>;
}
