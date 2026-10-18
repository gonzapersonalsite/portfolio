import React from 'react'
import { Box, Grid, Skeleton, Stack, Container } from '@mui/material'

export const HeroSkeleton: React.FC = () => (
  <Box sx={{ minHeight: '90vh', display: 'flex', alignItems: 'center' }}>
    <Container maxWidth="lg">
      <Grid container spacing={4} sx={{ alignItems: 'center' }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Skeleton animation="wave" width="150px" height={24} sx={{ mb: 2 }} />
          <Skeleton animation="wave" width="80%" height={80} sx={{ mb: 2 }} />
          <Skeleton animation="wave" width="60%" height={48} sx={{ mb: 4 }} />
          <Skeleton animation="wave" width="90%" height={24} sx={{ mb: 1 }} />
          <Skeleton animation="wave" width="85%" height={24} sx={{ mb: 4 }} />
          <Stack direction="row" spacing={2}>
            <Skeleton animation="wave" variant="rectangular" width={160} height={48} sx={{ borderRadius: 1 }} />
            <Skeleton animation="wave" variant="rectangular" width={160} height={48} sx={{ borderRadius: 1 }} />
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }} sx={{ display: { xs: 'none', md: 'block' } }}>
          <Skeleton animation="wave" variant="rectangular" width="100%" height={250} sx={{ borderRadius: 4 }} />
        </Grid>
      </Grid>
    </Container>
  </Box>
)

const ProjectCardSkeleton: React.FC = () => (
  <Box sx={{ height: '100%', borderRadius: 4, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
    <Skeleton animation="wave" variant="rectangular" width="100%" sx={{ pt: '56.25%' }} />
    <Box sx={{ p: 3 }}>
      <Skeleton animation="wave" width="60%" height={32} sx={{ mb: 1 }} />
      <Skeleton animation="wave" width="100%" height={20} sx={{ mb: 0.5 }} />
      <Skeleton animation="wave" width="90%" height={20} sx={{ mb: 2 }} />
      <Stack direction="row" spacing={1}>
        <Skeleton animation="wave" width={60} height={24} />
        <Skeleton animation="wave" width={60} height={24} />
        <Skeleton animation="wave" width={60} height={24} />
      </Stack>
    </Box>
  </Box>
)

const PROJECT_SKELETON_COUNT = 6

export const ProjectGridSkeleton: React.FC = () => (
  <Grid container spacing={4}>
    {Array.from({ length: PROJECT_SKELETON_COUNT }, (_, index) => (
      <Grid size={{ xs: 12, md: 6, lg: 4 }} key={index}>
        <ProjectCardSkeleton />
      </Grid>
    ))}
  </Grid>
)

export const AboutSkeleton: React.FC = () => (
  <Grid container spacing={6}>
    <Grid size={{ xs: 12, md: 5 }}>
      <Skeleton animation="wave" variant="rectangular" width="100%" sx={{ pt: '125%', borderRadius: 4 }} />
      <Stack direction="row" spacing={2} sx={{ mt: 4, justifyContent: 'center' }}>
        <Skeleton animation="wave" variant="rectangular" width={180} height={48} sx={{ borderRadius: 1 }} />
      </Stack>
    </Grid>
    <Grid size={{ xs: 12, md: 7 }}>
      <Skeleton animation="wave" width="80%" height={40} sx={{ mb: 3 }} />
      <Skeleton animation="wave" width="100%" height={24} sx={{ mb: 1 }} />
      <Skeleton animation="wave" width="100%" height={24} sx={{ mb: 1 }} />
      <Skeleton animation="wave" width="95%" height={24} sx={{ mb: 1 }} />
      <Skeleton animation="wave" width="90%" height={24} sx={{ mb: 4 }} />

      <Skeleton animation="wave" width="40%" height={32} sx={{ mb: 2 }} />
      <Stack direction="row" spacing={1} sx={{ mb: 4 }}>
        <Skeleton animation="wave" width={80} height={32} sx={{ borderRadius: 4 }} />
        <Skeleton animation="wave" width={80} height={32} sx={{ borderRadius: 4 }} />
        <Skeleton animation="wave" width={80} height={32} sx={{ borderRadius: 4 }} />
      </Stack>

      <Skeleton animation="wave" width="40%" height={32} sx={{ mb: 2 }} />
      <Stack direction="row" spacing={2}>
        <Skeleton animation="wave" width={120} height={32} sx={{ borderRadius: 4 }} />
        <Skeleton animation="wave" width={120} height={32} sx={{ borderRadius: 4 }} />
      </Stack>
    </Grid>
  </Grid>
)

export const SkillsSkeleton: React.FC = () => (
  <Grid container spacing={4}>
    {[1, 2, 3, 4].map((i) => (
      <Grid size={{ xs: 12, md: 6 }} key={i}>
        <Box
          sx={{
            p: 4,
            borderRadius: 4,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            height: '100%',
          }}
        >
          <Skeleton animation="wave" width="40%" height={32} sx={{ mb: 3 }} />
          <Stack spacing={3}>
            {[1, 2, 3, 4].map((j) => (
              <Box key={j}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Skeleton animation="wave" width="30%" height={24} />
                  <Skeleton animation="wave" width="10%" height={20} />
                </Box>
                <Skeleton animation="wave" height={8} sx={{ borderRadius: 4 }} />
              </Box>
            ))}
          </Stack>
        </Box>
      </Grid>
    ))}
  </Grid>
)

export const ExperienceSkeleton: React.FC = () => (
  <Box sx={{ maxWidth: '800px', mx: 'auto' }}>
    {[1, 2, 3].map((i) => (
      <Box key={i} sx={{ display: 'flex', gap: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Skeleton animation="wave" variant="circular" width={40} height={40} />
          <Skeleton animation="wave" variant="rectangular" width={2} height="100%" sx={{ flexGrow: 1, my: 1 }} />
        </Box>
        <Box sx={{ flexGrow: 1, p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Skeleton animation="wave" width="30%" height={24} sx={{ mb: 1 }} />
          <Skeleton animation="wave" width="50%" height={32} sx={{ mb: 1 }} />
          <Skeleton animation="wave" width="40%" height={24} sx={{ mb: 2 }} />
          <Skeleton animation="wave" width="100%" height={20} sx={{ mb: 0.5 }} />
          <Skeleton animation="wave" width="90%" height={20} sx={{ mb: 2 }} />
          <Stack direction="row" spacing={1}>
            <Skeleton animation="wave" width={60} height={24} />
            <Skeleton animation="wave" width={60} height={24} />
          </Stack>
        </Box>
      </Box>
    ))}
  </Box>
)

export const PageHeaderSkeleton: React.FC = () => (
  <Box sx={{ mb: 6 }}>
    <Skeleton animation="wave" width="100px" height={24} sx={{ mb: 1 }} />
    <Skeleton animation="wave" width="300px" height={60} />
  </Box>
)

export const ContactSkeleton: React.FC = () => (
  <Grid container spacing={6}>
    <Grid size={{ xs: 12, md: 5 }}>
      <Skeleton animation="wave" width="60%" height={40} sx={{ mb: 2 }} />
      <Skeleton animation="wave" width="100%" height={80} sx={{ mb: 4 }} />

      <Stack spacing={3} sx={{ mb: 6 }}>
        {[1, 2].map((i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Skeleton animation="wave" variant="circular" width={40} height={40} />
            <Box>
              <Skeleton animation="wave" width={60} height={16} sx={{ mb: 0.5 }} />
              <Skeleton animation="wave" width={150} height={24} />
            </Box>
          </Box>
        ))}
      </Stack>

      <Skeleton animation="wave" width="40%" height={32} sx={{ mb: 2 }} />
      <Stack direction="row" spacing={2}>
        <Skeleton animation="wave" variant="circular" width={40} height={40} />
        <Skeleton animation="wave" variant="circular" width={40} height={40} />
      </Stack>
    </Grid>
    <Grid size={{ xs: 12, md: 7 }}>
      <Skeleton animation="wave" variant="rectangular" width="100%" height={500} sx={{ borderRadius: 4 }} />
    </Grid>
  </Grid>
)
