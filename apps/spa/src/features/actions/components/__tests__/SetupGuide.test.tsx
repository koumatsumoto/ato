import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SetupGuide } from "../SetupGuide";

describe("SetupGuide", () => {
  it("renders 3-step guide", () => {
    const { container } = render(<SetupGuide />);

    const steps = container.querySelectorAll("ol > li");
    expect(steps).toHaveLength(3);
  });

  it("renders repository creation link with correct URL", () => {
    render(<SetupGuide />);

    const link = screen.getByRole("link", { name: /リポジトリを作成/ });
    expect(link).toHaveAttribute("href", "https://github.com/new?name=ato-datastore&visibility=private&auto_init=true");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders GitHub App installation link with correct URL", () => {
    render(<SetupGuide />);

    const link = screen.getByRole("link", { name: /ATO App をインストール/ });
    expect(link).toHaveAttribute("href", "https://github.com/apps/ato-app/installations/new");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders reload button", () => {
    render(<SetupGuide />);

    expect(screen.getByRole("button", { name: /再読み込み/ })).toBeInTheDocument();
  });
});
