import { useCallback, useState } from "react";
import CanvasTab from "./customizer/CanvasTab";
import PhotoDetailsTab from "./customizer/PhotoDetailsTab";
import SchoolTab from "./customizer/SchoolTab";
import StudentTab from "./customizer/StudentTab";
import QrTab from "./customizer/QrTab";
import TabNavigation from "./customizer/TabNavigation";

const CustomizerPanel = ({ config, setConfig, toggleOrientation, cardType = "student" }) => {
  const [activeTab, setActiveTab] = useState("background");
  const updateConfig = useCallback((changes) => setConfig((previous) => ({ ...previous, ...changes })), [setConfig]);
  const tabProps = { config, updateConfig };

  return <form className="customizer-panel" onSubmit={(event) => event.preventDefault()}>
    <div className="customizer-panel-head"><h3 className="customizer-panel-heading">Controls</h3></div>
    <TabNavigation activeTab={activeTab} onChange={setActiveTab} cardType={cardType} />
    <div className="customizer-panel-scroll">
      {activeTab === "background" && <CanvasTab {...tabProps} toggleOrientation={toggleOrientation} />}
      {activeTab === "school" && <SchoolTab {...tabProps} />}
      {activeTab === "student" && <StudentTab {...tabProps} cardType={cardType} />}
      {activeTab === "photo-details" && <PhotoDetailsTab {...tabProps} />}
      {activeTab === "qr-code" && <QrTab {...tabProps} />}
    </div>
  </form>;
};

export default CustomizerPanel;

