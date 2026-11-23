// ==============================================================================
// المنصة التعليمية الموحدة — حاجز حماية الأخطاء (React Error Boundary)
// Prevents full white-screen crashes and provides instant safe recovery
// ==============================================================================

import React from "react";
import { Icons } from "../icons/SvgIcons";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  resetKey?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || "حدث خطأ غير متوقع أثناء عرض هذا القسم."
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("[ErrorBoundary] Caught rendering error:", error, info.componentStack);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, errorMessage: "" });
    }
  }

  handleRecover = (): void => {
    this.setState({ hasError: false, errorMessage: "" });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div
          className="pending-box"
          role="alert"
          style={{ margin: "40px auto", maxWidth: 560, textAlign: "center" }}
        >
          <div className="pb-ic" style={{ color: "var(--err)" }}>
            <Icons.Warning size={36} />
          </div>
          <div className="pb-t">تعذّر عرض هذا القسم مؤقتاً</div>
          <div className="pb-s" style={{ marginBottom: 16 }}>
            {this.state.errorMessage}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button type="button" className="btn btn-primary btn-sm" onClick={this.handleRecover}>
              <Icons.Rotate size={14} />
              <span>إعادة المحاولة</span>
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => window.location.reload()}
            >
              تحديث الصفحة
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
