Task: Create New Training Pages in \Trainings\SI Using \Trainings\SI-Copy as Source

Objective:
Open and analyze all HTML files located in:

\Trainings\SI-Copy

Use these files as the source content and structure reference to create corresponding pages in:

\Trainings\SI

Requirements:

1. Reference Template

   * Use content.html in \Trainings\SI as the primary template and layout reference.
   * Preserve the existing styling, navigation, header, footer, theme, JavaScript functionality, responsive behavior, and overall page structure from content.html.
   * Do not modify shared components unless necessary for compatibility.

2. Content Migration

   * Open each HTML file in \Trainings\SI-Copy.
   * Extract:

     * Page title
     * Main content
     * Images
     * Tables
     * Lists
     * Code blocks
     * Internal links
     * Embedded media
   * Rebuild the content inside the content area of the new page while preserving formatting and hierarchy.

3. New Page Creation

   * Create a matching page in \Trainings\SI for every HTML file found in \Trainings\SI-Copy.
   * Use meaningful file names that match the source files.
   * Ensure all generated pages follow the same design system and layout as content.html.

4. Navigation Updates

   * Update all relevant navigation menus, sidebars, breadcrumbs, previous/next links, and training indexes.
   * Ensure every new page is accessible through the training navigation structure.
   * Maintain logical page ordering.

5. Asset Handling

   * Copy and relink all required:

     * Images
     * Icons
     * PDFs
     * Downloads
     * CSS references
     * JavaScript references
   * Convert relative paths as required for the new directory structure.

6. SEO and Metadata

   * Generate appropriate:

     * Page titles
     * Meta descriptions
     * Open Graph tags
     * Canonical URLs
   * Preserve any existing metadata from source files where appropriate.

7. Quality Checks

   * Verify:

     * No broken links
     * No missing images
     * No JavaScript errors
     * Mobile responsiveness
     * Consistent styling
     * Proper heading hierarchy (H1 → H2 → H3)
     * Accessibility compliance

8. Deliverables

   * Create all required HTML files in \Trainings\SI.
   * Provide a summary report containing:

     * Source file name
     * New file name
     * Assets copied
     * Navigation changes made
     * Any issues encountered
     * Missing dependencies requiring manual review

Execution Steps:

1. Scan \Trainings\SI-Copy for all HTML files.
2. Analyze content.html in \Trainings\SI.
3. Create page mapping between source and destination.
4. Generate all new pages.
5. Update navigation.
6. Validate links and assets.
7. Produce migration report.

Important:
Maintain the exact visual appearance, theme, layout behavior, and user experience of content.html while transferring the educational content from \Trainings\SI-Copy into the new pages.
