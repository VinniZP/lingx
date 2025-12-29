import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  // This bundles all necessary dependencies for self-contained deployment
  output: "standalone",

  // Redirect old URL structure to new simplified structure
  async redirects() {
    return [
      // Old translations page -> new translations page
      {
        source: '/projects/:projectId/spaces/:spaceId/branches/:branchId/translations',
        destination: '/projects/:projectId/translations/:branchId',
        permanent: true,
      },
      // Old branch page -> new translations page (since branch detail is removed)
      {
        source: '/projects/:projectId/spaces/:spaceId/branches/:branchId',
        destination: '/projects/:projectId/translations/:branchId',
        permanent: true,
      },
      // Old space detail -> project page
      {
        source: '/projects/:projectId/spaces/:spaceId',
        destination: '/projects/:projectId',
        permanent: true,
      },
      // Old spaces list -> project page
      {
        source: '/projects/:projectId/spaces',
        destination: '/projects/:projectId',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
