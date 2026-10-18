import React from 'react'
import { Box, Container, Typography, Grid } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { getAllProjects, ProjectCard } from '@/entities/project'
import { EmptyState } from '@/shared/ui'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'
import { useContent, usePageMeta } from '@/shared/lib'

const ProjectsPage: React.FC = () => {
  const { t } = useTranslation()

  usePageMeta({
    title: t('seo.projects.title'),
    description: t('seo.projects.description'),
  })

  const { data: projects } = useContent(() => getAllProjects())

  return (
    <Box sx={{ py: 8 }}>
      <Container maxWidth="lg">
        <Typography variant="overline" color="primary" sx={{ fontWeight: 'bold' }}>
          {t('nav.projects')}
        </Typography>
        <Typography variant="h2" component="h1" gutterBottom sx={{ mb: 6, fontWeight: '800' }}>
          {t('projects.heading')}
        </Typography>

        {projects.length > 0 ? (
          <Grid container component="ul" spacing={4} sx={{ listStyle: 'none', p: 0, m: 0 }}>
            {projects.map((project, index) => (
              <Grid component="li" size={{ xs: 12, md: 6, lg: 4 }} key={project.id}>
                {/* The first cover sits above the fold and is preloaded by the route shell. */}
                <ProjectCard project={project} priority={index === 0} titleComponent="h2" />
              </Grid>
            ))}
          </Grid>
        ) : (
          <EmptyState
            title={t('emptyState.projects.title')}
            description={t('emptyState.projects.description')}
            icon={<RocketLaunchIcon />}
          />
        )}
      </Container>
    </Box>
  )
}

export default ProjectsPage
