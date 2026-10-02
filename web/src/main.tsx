import { createRoot } from "react-dom/client";

import { applyTheme } from "@/hooks/useTheme";

import { AnnotationTransferApp } from "./App";
import "./styles/index.css";

applyTheme("light");

createRoot(document.getElementById("root")!).render(<AnnotationTransferApp />);
