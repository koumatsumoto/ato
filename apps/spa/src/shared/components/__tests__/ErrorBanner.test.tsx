import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorBanner } from "../ui/ErrorBanner";

describe("ErrorBanner", () => {
  it("renders error message with alert role", () => {
    render(<ErrorBanner error={new Error("Something went wrong")} />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("renders retry button when onRetry is provided", () => {
    render(<ErrorBanner error={new Error("fail")} onRetry={() => {}} />);

    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("does not render retry button when onRetry is not provided", () => {
    render(<ErrorBanner error={new Error("fail")} />);

    expect(screen.queryByText("Retry")).not.toBeInTheDocument();
  });

  it("calls onRetry when retry button is clicked", async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();

    render(<ErrorBanner error={new Error("fail")} onRetry={onRetry} />);
    await user.click(screen.getByText("Retry"));

    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("renders dismiss button when onDismiss is provided", () => {
    render(<ErrorBanner error={new Error("fail")} onDismiss={() => {}} />);

    expect(screen.getByText("Dismiss")).toBeInTheDocument();
  });

  it("calls onDismiss when dismiss button is clicked", async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();

    render(<ErrorBanner error={new Error("fail")} onDismiss={onDismiss} />);
    await user.click(screen.getByText("Dismiss"));

    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
