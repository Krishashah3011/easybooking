import { useNavigation } from "react-router";
import "./RouteLoadingBar.css";

export function RouteLoadingBar() {
  const navigationML = useNavigation();
  const isLoadingML = navigationML.state !== "idle";

  return (
    <div
      className={`route-loading-overlay${isLoadingML ? " route-loading-overlay--active" : ""}`}
      role="progressbar"
      aria-hidden={!isLoadingML}
      aria-valuetext={isLoadingML ? "Loading" : undefined}
    >
      <div className="route-loading-overlay__spinner" />
    </div>
  );
}