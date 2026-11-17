import { useState } from "react";
import { imageUrl, initials } from "../utils/format.js";

export default function Avatar({ url, name, sizeClass = "", className = "bb-avatar" }) {
  const [failedUrl, setFailedUrl] = useState(null);
  const classes = className + (sizeClass ? " " + sizeClass : "");

  if (url && failedUrl !== url) {
    return (
      <img
        className={classes}
        src={imageUrl(url)}
        alt={name || "Student"}
        onError={() => setFailedUrl(url)}
      />
    );
  }
  return (
    <span className={classes} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
