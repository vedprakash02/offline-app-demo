import "./TabNavigation.css";

const tabs = [
  ["background", "Canvas"],
  ["school", "School header"],
  ["student", "Student name & class name"],
  ["photo-details", "Photo & student details"],
  ["qr-code", "QR code"],
];

const TabNavigation = ({ activeTab, onChange, cardType = "student" }) => (
  <div className="tab-navigation-wrapper" role="tablist" aria-label="Customizer sections">
    {tabs.map(([id, label]) => {
      const displayLabel =
        cardType === "teacher" && id === "student"
          ? "Name & designation"
          : cardType === "teacher" && id === "photo-details"
            ? "Photo & card details"
            : label;

      return (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={activeTab === id}
          className={`tab-btn ${activeTab === id ? "active" : ""}`}
          onClick={() => onChange(id)}
        >
          {displayLabel}
        </button>
      );
    })}
  </div>
);

export default TabNavigation;

