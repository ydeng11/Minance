"use client";

import type { CardFaceStyle } from "./cardStyles";
import { inferCardFaceStyle } from "./cardStyles";
import { formatAccountTypeLabel } from "./accountFormatting";

interface CardFaceProps {
  sourceInstitution: string | null;
  accountType: string;
  displayName: string;
  /** Compact variant for the account list grid */
  compact?: boolean;
  /** Fill the parent container (ignores compact sizing) */
  cover?: boolean;
  /** Allow external CSS class override */
  className?: string;
}

function CardChip({ compact }: { compact: boolean }) {
  return (
    <svg
      width={compact ? 18 : 28}
      height={compact ? 14 : 22}
      viewBox="0 0 28 22"
      fill="none"
      aria-hidden="true"
    >
      <rect x="0.5" y="0.5" width="27" height="21" rx="3" fill="rgba(255,255,255,0.25)" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
      <rect x="6" y="4" width="16" height="14" rx="2" fill="rgba(255,255,255,0.1)" />
      <line x1="14" y1="4" x2="14" y2="18" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
      <line x1="6" y1="11" x2="22" y2="11" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
    </svg>
  );
}

export function CardFace({
  sourceInstitution,
  accountType,
  displayName,
  compact = true,
  cover = false,
  className = ""
}: CardFaceProps) {
  const style: CardFaceStyle = inferCardFaceStyle(sourceInstitution, accountType);

  // cover mode uses the full viewBox size so all internal elements fill the parent
  const width = cover ? 280 : (compact ? 140 : 280);
  const height = cover ? 176 : (compact ? 88 : 176);
  const fontSize = compact ? 18 : 36;
  const labelSize = compact ? 9 : 14;
  const nameSize = compact ? 8 : 12;

  const hasRealImage = Boolean(style.cardImageUrl);
  const cardId = displayName.replace(/\s+/g, "-");

  return (
    <svg
      width={cover ? "100%" : width}
      height={cover ? "100%" : height}
      viewBox={cover ? "0 0 280 176" : `0 0 ${width} ${height}`}
      preserveAspectRatio={cover ? "xMidYMid meet" : undefined}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={`${displayName} card`}
      style={{ overflow: "hidden" }}
    >
      {hasRealImage ? (
        <image
          href={style.cardImageUrl}
          width={width}
          height={height}
          preserveAspectRatio="xMidYMid slice"
        />
      ) : (
        <>
          {/* Background gradient */}
          <defs>
            <linearGradient id={`card-bg-${cardId}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={style.primary} />
              <stop offset="100%" stopColor={style.secondary} />
            </linearGradient>
            <linearGradient id={`card-shine-${cardId}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
              <stop offset="50%" stopColor="rgba(255,255,255,0.02)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>

          <rect width={width} height={height} rx={compact ? 8 : 12} fill={`url(#card-bg-${cardId})`} />
          <rect width={width} height={height} rx={compact ? 8 : 12} fill={`url(#card-shine-${cardId})`} />

          {/* Accent stripe */}
          <rect x="0" y="0" width="6" height={height} rx={0} fill={style.accent} opacity={0.6} />

          {/* Initial + chip */}
          <g transform={`translate(${compact ? 10 : 20}, ${compact ? 10 : 20})`}>
            <text
              x="0"
              y="0"
              fontSize={fontSize}
              fontWeight="700"
              fill={style.textColor}
              opacity={0.9}
              fontFamily="system-ui, -apple-system, sans-serif"
              dominantBaseline="hanging"
            >
              {style.initial}
            </text>
            {!compact && (
              <g transform="translate(0, 52)">
                <CardChip compact={false} />
              </g>
            )}
          </g>

          {/* Card name */}
          <text
            x={compact ? 10 : 20}
            y={compact ? height - 30 : height - 45}
            fontSize={nameSize}
            fill={style.textColor}
            opacity={0.7}
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            {displayName.length > (compact ? 14 : 24)
              ? displayName.slice(0, compact ? 14 : 24)
              : displayName}
          </text>

          {/* Account type label */}
          <text
            x={compact ? 10 : 20}
            y={compact ? height - 14 : height - 20}
            fontSize={labelSize}
            fontWeight="600"
            fill={style.accent}
            opacity={0.9}
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            {formatAccountTypeLabel(accountType)}
          </text>
        </>
      )}
    </svg>
  );
}
