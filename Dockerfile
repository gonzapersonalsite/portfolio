FROM node:24.22.3-trixie@sha256:6e5d4c38403930b420404f190be8563396dca2bd156a6cb4722707b0efcf6fc1
RUN install -d -o node -g node /opt/react-tools
USER node
WORKDIR /opt/react-tools
COPY tools/install-pnpm.py ./
RUN --mount=type=bind,source=frontend/package.json,target=package.json \
    --mount=type=bind,source=frontend/pnpm-lock.yaml,target=pnpm-lock.yaml \
    --mount=type=cache,target=/opt/react-tools/archives,uid=1000,gid=1000,sharing=locked \
    python3 install-pnpm.py
ARG TPL_UID=1000
ARG TPL_GID=1000
USER root
RUN test "$TPL_UID" -gt 0 && test "$TPL_GID" -gt 0 \
    && install -d -o "$TPL_UID" -g "$TPL_GID" /workspace/frontend/node_modules /pnpm
USER ${TPL_UID}:${TPL_GID}
ENV PATH="/opt/react-tools:${PATH}" HOME=/tmp \
    XDG_CACHE_HOME=/pnpm/cache XDG_DATA_HOME=/pnpm/data \
    XDG_STATE_HOME=/pnpm/state XDG_CONFIG_HOME=/tmp/config \
    PNPM_HOME=/pnpm/home CI=true
WORKDIR /workspace
ENTRYPOINT ["sh", "tools/launcher/run-step.sh", "sh", "tools/react.sh"]
