import { useState, useRef, useEffect, useCallback } from "react";
import type { Agent, Customer, ChatMessage } from "@/types/agents";
import { generateMockCustomer, generateBureauResponse } from "@/data/agents-mock";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  ArrowLeft, Send, Paperclip, Search, Upload, FileText, ShieldAlert,
  BarChart3, GitBranch, Brain, RefreshCw, Download, History, ChevronDown,
  ChevronRight, AlertTriangle, FileCheck, CreditCard, TrendingUp,
  Activity, Calendar, DollarSign, PiggyBank, Wallet, BadgePercent, MessageSquare,
  Landmark, User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BureauEnquiryModal } from "./BureauEnquiryModal";
import { BankStatementUploadModal } from "./BankStatementUploadModal";
import { CustomerContextPanel } from "./CustomerContextPanel";
import { SourcesConfigTab } from "./SourcesConfigTab";

const toolIcons: Record<string, React.ElementType> = {
  "bureau-enquiry": Search,
  "open-banking": Landmark,
  "bank-upload": Upload,
  "gst-fetch": FileText,
  "fraud-check": ShieldAlert,
  "risk-simulation": BarChart3,
  "tradeline-sim": GitBranch,
};

const DEFAULT_RECOMMENDED_TOOLS = [
  { id: "bureau-enquiry", name: "Bureau Enquiry", description: "Pull credit bureau report", icon: "Search" },
  { id: "open-banking", name: "Open Banking", description: "Pull data from open banking", icon: "Landmark" },
  { id: "bank-upload", name: "Upload Bank Statement", description: "Analyze bank statement", icon: "Upload" },
  { id: "gst-fetch", name: "Fetch GST Data", description: "Retrieve GST filing data", icon: "FileText" },
  { id: "fraud-check", name: "Fraud Check", description: "Run fraud detection", icon: "ShieldAlert" },
  { id: "risk-simulation", name: "Risk Simulation", description: "Simulate risk scenarios", icon: "BarChart3" },
  { id: "tradeline-sim", name: "What-if Simulation", description: "Model trade line impact", icon: "GitBranch" },
];

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
  const [showBankUploadModal, setShowBankUploadModal] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [sources, setSources] = useState<Record<string, boolean>>(agent.sources);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const baseToolsList = (agent.tools.length > 0 ? agent.tools : DEFAULT_RECOMMENDED_TOOLS).slice(0, 6);
  const [recommendedToolOrder, setRecommendedToolOrder] = useState<string[]>(() => baseToolsList.map((t) => t.id));

  // Mock list of past chat sessions (replace with API later)
  const chatHistoryList = [
    { id: "1", title: "Credit assessment for John Doe", date: "Today, 10:30 AM" },
    { id: "2", title: "Bureau enquiry – PAN verification", date: "Today, 9:15 AM" },
    { id: "3", title: "Loan eligibility discussion", date: "Yesterday, 4:22 PM" },
    { id: "4", title: "Fraud check follow-up", date: "Yesterday, 11:00 AM" },
    { id: "5", title: "Portfolio risk overview", date: "Feb 25, 3:45 PM" },
  ];

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
    setRecommendedToolOrder((prev) => {
      const i = prev.indexOf(toolId);
      if (i === -1) return prev;
      const next = [...prev];
      next.splice(i, 1);
      next.push(toolId);
      return next;
    });
    if (toolId === "bureau-enquiry") {
      setShowBureauModal(true);
    } else if (toolId === "bank-upload") {
      setShowBankUploadModal(true);
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

  const handleBankStatementSubmit = useCallback((file: File) => {
    setShowBankUploadModal(false);

    const systemMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "system",
      content: `Bank statement uploaded: **${file.name}**`,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, systemMsg]);

    setTimeout(() => {
      const agentMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "agent",
        content: `I've received the bank statement. Running cash flow analysis—this will help assess income stability, spending patterns, and savings behavior for a complete credit view.`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, agentMsg]);
    }, 800);
  }, []);

  const recommendedTools = recommendedToolOrder
    .map((id) => baseToolsList.find((t) => t.id === id))
    .filter((t): t is (typeof baseToolsList)[number] => t != null);

  return (
    <div className="flex flex-col min-h-0 flex-1 overflow-hidden h-full min-h-0 px-4 pt-4 sm:px-0 sm:pt-0">
      {/* Header - sticky at top on mobile; top padding from container to match AgentDetailPage */}
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-1.5 sm:gap-2 pb-2 sm:pb-2.5 border-b border-border shrink-0 px-0 bg-background">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 h-8 w-8" aria-label="Back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 dark:bg-primary/20 border border-primary/20 flex items-center justify-center shrink-0">
            <Brain className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
          </div>
          <h2 className="text-body font-semibold text-foreground truncate">{agent.name}</h2>
          <span
            className="w-2 h-2 rounded-full bg-success shrink-0 hidden sm:block"
            title="Online"
            aria-hidden
          />
        </div>
        <div className="flex items-center gap-0.5 sm:gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden gap-1 text-caption h-7 px-2 sm:px-2.5 text-muted-foreground hover:text-foreground"
            onClick={() => setShowProfileSheet(true)}
            aria-label="Customer profile"
          >
            <User className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Profile</span>
          </Button>
          <Button variant="ghost" size="sm" className="gap-1 text-caption h-7 px-2 sm:px-2.5 text-muted-foreground hover:text-foreground">
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button variant="ghost" size="sm" className="gap-1 text-caption h-7 px-2 sm:px-2.5 text-muted-foreground hover:text-foreground">
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-caption h-7 px-2 sm:px-2.5 text-muted-foreground hover:text-foreground"
            onClick={() => setShowChatHistory(true)}
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Chat History</span>
          </Button>
        </div>
      </header>

      {/* Main split - customer panel hidden below lg */}
      <div className="flex flex-1 min-h-0 gap-0 mt-3 sm:mt-4 overflow-hidden">
        {/* Left - Customer Context (hidden on mobile/tablet); own scroll to avoid layout conflict */}
        <aside className="hidden lg:flex lg:w-[40%] lg:max-w-[420px] xl:w-[40%] xl:max-w-[420px] border-r border-border pr-3 xl:pr-4 flex-col min-h-0 overflow-hidden shrink-0">
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <CustomerContextPanel customer={customer} />
          </div>
        </aside>

        {/* Right - Chat */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden pl-0 lg:pl-4 min-h-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0 overflow-hidden min-w-0">
            <TabsContent value="chat" className="flex-1 flex flex-col min-h-0 overflow-hidden data-[state=inactive]:hidden flex data-[state=active]:flex">
              <div className="flex flex-col flex-1 min-h-0 overflow-hidden min-w-0">
                {/* Messages - scrollable; wrapper constrains height so only this area scrolls */}
                <div className="flex-1 min-h-0 overflow-hidden flex flex-col min-w-0">
                  <ScrollArea className="flex-1 min-h-0 h-0 basis-0 min-w-0">
                  <div className="space-y-4 px-1 sm:px-2 pr-2 pb-4">
                    {messages.map((msg) => (
                      <ChatBubble key={msg.id} message={msg} />
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  </ScrollArea>
                </div>

                {/* Recommended tools - horizontal scroll on small screens; no bottom border above input */}
                <div className="shrink-0 py-3 sm:py-4 border-b-0">
                <p className="text-[9px] sm:text-caption font-medium text-muted-foreground mb-2 px-1">Recommended tools</p>
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                  {recommendedTools.map((tool) => {
                    const TIcon = toolIcons[tool.id] || Brain;
                    return (
                      <button
                        key={tool.id}
                        onClick={() => handleToolClick(tool.id)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-card-foreground hover:bg-muted/80 hover:border-primary/30 transition-all duration-200 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <TIcon className="w-4 h-4 text-primary shrink-0" />
                        <div className="text-left min-w-0">
                          <div className="text-caption font-medium text-foreground truncate max-w-[120px] sm:max-w-none">{tool.name}</div>
                          <div className="text-[9px] text-muted-foreground truncate max-w-[120px] sm:max-w-none">{tool.description}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="sources" className="flex-1 min-h-0 overflow-auto data-[state=inactive]:hidden">
              <SourcesConfigTab sources={sources} onToggle={(key) => setSources((s) => ({ ...s, [key]: !s[key] }))} />
            </TabsContent>

            {/* Bottom bar: Attach + Input + Send - sticky at bottom on mobile; no top border */}
            <div className="sticky bottom-0 z-10 shrink-0 flex flex-wrap gap-2 items-center pt-1 pb-1 bg-background border-t-0 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
              <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9 text-muted-foreground hover:text-foreground" aria-label="Attach file">
                <Paperclip className="w-4 h-4" />
              </Button>
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="Type your message..."
                className="flex-1 min-w-0 text-sm sm:text-base rounded-lg border-border bg-background"
              />
              <Button size="icon" onClick={handleSend} disabled={!inputValue.trim()} className="shrink-0 h-9 w-9 bg-primary text-primary-foreground hover:bg-primary/90">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </Tabs>
        </div>
      </div>

      {/* Bureau Enquiry Modal */}
      <BureauEnquiryModal
        open={showBureauModal}
        onClose={() => setShowBureauModal(false)}
        onSubmit={handleBureauSubmit}
      />

      {/* Bank Statement Upload Modal */}
      <BankStatementUploadModal
        open={showBankUploadModal}
        onClose={() => setShowBankUploadModal(false)}
        onSubmit={handleBankStatementSubmit}
      />

      {/* Customer Profile sheet (tablet/mobile only; opened via header Profile button) */}
      <Sheet open={showProfileSheet} onOpenChange={setShowProfileSheet}>
        <SheetContent side="left" className="w-full max-w-[min(100vw,420px)] flex flex-col p-0">
          <SheetHeader className="border-b border-border px-4 sm:px-6 py-3 sm:py-4 shrink-0">
            <SheetTitle className="text-h4 font-semibold text-foreground">Customer profile</SheetTitle>
          </SheetHeader>
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <CustomerContextPanel customer={customer} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Chat History panel */}
      <Sheet open={showChatHistory} onOpenChange={setShowChatHistory}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
          <SheetHeader className="border-b border-border px-6 py-4 shrink-0">
            <SheetTitle className="text-h4 font-semibold text-foreground">Chat History</SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 space-y-1">
              {chatHistoryList.map((chat) => (
                <button
                  key={chat.id}
                  type="button"
                  className={cn(
                    "w-full flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-left",
                    "hover:bg-muted/80 hover:border-primary/20 transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  )}
                  onClick={() => {
                    // TODO: load chat by id when API is ready
                    setShowChatHistory(false);
                  }}
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 dark:bg-primary/20 border border-primary/20 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-medium text-foreground line-clamp-2">{chat.title}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{chat.date}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                </button>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (isSystem) {
    return (
      <div className="flex justify-center px-2">
        <div className="px-3 py-1.5 rounded-full bg-muted border border-border/50 text-caption text-muted-foreground max-w-[95%] sm:max-w-[85%] truncate">
          {message.content.replace(/\*\*/g, "")} · {time}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex gap-2 px-1 sm:px-0", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 dark:bg-primary/20 border border-primary/20 flex items-center justify-center shrink-0 mt-1">
          <Brain className="w-4 h-4 text-primary" />
        </div>
      )}
      <div className={cn("space-y-2 min-w-0 max-w-[95%] sm:max-w-[90%] lg:max-w-[85%]", isUser && "flex flex-col items-end")}>
        <div
          className={cn(
            "rounded-lg px-3 py-2.5 sm:px-4 sm:py-3 text-body leading-relaxed break-words",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-card border border-border text-foreground"
          )}
        >
          <SimpleMarkdown text={message.content} />
        </div>
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
      elements.push(<div key={idx} className="flex gap-1.5 ml-1 text-body"><span className="text-muted-foreground">•</span><span>{renderInline(line.slice(2))}</span></div>);
    } else if (line.startsWith("✅") || line.startsWith("⚠️")) {
      elements.push(<p key={idx} className="text-body">{renderInline(line)}</p>);
    } else if (line.trim() === "") {
      elements.push(<div key={idx} className="h-1" />);
    } else {
      elements.push(<p key={idx} className="text-body">{renderInline(line)}</p>);
    }
  });
  if (inTable) flushTable();

  return <div className="space-y-0.5 leading-relaxed text-body">{elements}</div>;
}
