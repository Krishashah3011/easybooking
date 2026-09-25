import { useNavigation } from "react-router";
import "./RouteLoadingBar.css";

export function RouteLoadingBar() {
  const navigationML = useNavigation();
  const isLoadingML = navigationML.state !== "idle";

  return (
    <div
      className={`route-loading-bar${isLoadingML ? " route-loading-bar--active" : ""}`}
      role="progressbar"
      aria-hidden={!isLoadingML}
      aria-valuetext={isLoadingML ? "Loading" : undefined}
    >
      <div className="route-loading-bar__fill" />
    </div>
  );
}