import { render, screen } from "@testing-library/react";
import { EventLog } from "./event-log.js";

describe("event log", () => {
  it("renders an Event Log heading", () => {
    render(<EventLog entries={[]} />);

    expect(screen.getByRole("heading", { name: /event log/i })).toBeInTheDocument();
  });

  it("renders entries in chronological order", () => {
    render(
      <EventLog
        entries={[
          { id: "1", text: "component placed" },
          { id: "2", text: "connection created" },
          { id: "3", text: "concept unlocked" },
        ]}
      />,
    );

    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toStrictEqual([
      "component placed",
      "connection created",
      "concept unlocked",
    ]);
  });

  it("uses a scrollable container", () => {
    render(<EventLog entries={[]} />);

    expect(screen.getByTestId("event-log-list")).toHaveStyle({
      overflowY: "auto",
    });
  });
});
