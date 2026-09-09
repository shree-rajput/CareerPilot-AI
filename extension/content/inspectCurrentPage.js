/**
 * CareerPilot AI - Safe Dynamic Inspection
 * Self-contained entry point for unsupported company sites.
 */
(function() {
  function inspect() {
    try {
      const urlStr = window.location.href;
      const u = new URL(urlStr);
      const path = u.pathname.toLowerCase();
      
      // 1. Verify page eligibility
      if (
        path === "/" || 
        path.includes("/login") || 
        path.includes("/sign_in") || 
        path.includes("/about") || 
        path.includes("/services") ||
        path.includes("/privacy") ||
        path.includes("/cookie") ||
        path.includes("/terms")
      ) {
        return { success: false, reason: "PAGE_RESTRICTED" };
      }

      // 2. Extract structured job information using Generic heuristics
      const titleEl = document.querySelector('h1, [itemprop="title"], .job-title');
      const title = titleEl ? titleEl.textContent.trim() : document.title.split("-")[0].trim();
      
      const companyEl = document.querySelector('[itemprop="hiringOrganization"], .company-name');
      const company = companyEl ? companyEl.textContent.trim() : u.hostname.replace(/^www\./, '').split('.')[0];
      
      const descEl = document.querySelector('[itemprop="description"], #job-description, .job-description, .posting-description, #content, article');
      const description = descEl ? descEl.textContent.trim() : "";
      
      const isNonGenericTitle = title.length >= 3 && !/^(home|careers|jobs|welcome|login|search|index)$/i.test(title);
      const isNonGenericCompany = company.length >= 2 && !/^(unknown|company)$/i.test(company);

      if (!isNonGenericTitle || !isNonGenericCompany || description.length < 80) {
        return { success: false, reason: "LOW_CONFIDENCE" };
      }

      return {
        success: true,
        pageType: "JOB_POSTING",
        confidence: 85,
        job: {
          title,
          company,
          location: document.querySelector('.location')?.textContent?.trim() || "",
          description,
          jobUrl: urlStr,
          externalJobId: "",
          source: "generic"
        }
      };
    } catch (err) {
      return { success: false, reason: "INSPECTION_ERROR", error: err.message };
    }
  }

  return inspect();
})();
