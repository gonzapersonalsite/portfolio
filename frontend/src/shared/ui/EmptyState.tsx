import React from 'react'
import { RocketIcon } from './Icons'
import './EmptyState.css'

export interface EmptyStateProps {
  readonly title: string
  readonly description: string
  readonly icon?: React.ReactNode
}

const EmptyState: React.FC<EmptyStateProps> = ({ title, description, icon }) => (
  <div className="empty-state">
    <div className="empty-state__icon" aria-hidden="true">
      {icon ?? <RocketIcon />}
    </div>
    <h2 className="empty-state__title">{title}</h2>
    <p className="empty-state__desc">{description}</p>
  </div>
)

export default EmptyState
