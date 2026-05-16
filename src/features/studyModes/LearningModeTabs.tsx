import { motion } from "motion/react";
import type { StudyModeId } from "./types";
import { STUDY_MODE_TABS } from "./registry";

export function LearningModeTabs(props: {
  activeMode: StudyModeId | null;
  onSelect: (mode: StudyModeId) => void;
}) {
  const { activeMode, onSelect } = props;
  return (
    <div className="flex w-full max-w-full flex-nowrap justify-center gap-1 overflow-x-auto pb-1 [scrollbar-width:thin]">
      {STUDY_MODE_TABS.map((tab) => {
        const isActive = activeMode === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            className={`relative shrink-0 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all duration-300 flex items-center gap-1 shadow-sm
              ${
                isActive
                  ? "text-white"
                  : "bg-slate-900/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800"
              }`}
          >
            {isActive && (
              <motion.div
                layoutId="active-study-pill"
                className="absolute inset-0 rounded-full bg-indigo-600 shadow-lg shadow-black/20"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
