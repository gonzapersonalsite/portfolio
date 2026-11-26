import React from 'react'
import { DotIcon } from './Icons'
import './StatusBadge.css'

export interface StatusBadgeProps {
  readonly label: string
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ label }) => (
  <span className="status-badge">
    <DotIcon className="status-badge__dot" />
    <span>{label}</span>
  </span>
)

export default StatusBadge
