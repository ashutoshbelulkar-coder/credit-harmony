import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 mb-4">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-md">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <Button variant="outline" className="mt-6" onClick={this.handleReset}>
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
