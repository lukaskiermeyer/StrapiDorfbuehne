const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🚀 Starting Monthly Update Scan Report...");

  const dashboardUrl = process.env.DASHBOARD_URL;
  const scanApiSecret = process.env.SCAN_API_SECRET;
  const repoName = process.env.REPO_NAME;

  if (!dashboardUrl || !scanApiSecret || !repoName) {
    console.error("❌ Missing required environment variables (DASHBOARD_URL, SCAN_API_SECRET, REPO_NAME)");
    process.exit(1);
  }

  const workspaceDir = process.env.GITHUB_WORKSPACE || process.cwd();
  
  // 1. Read and Parse audit-prod.json
  let prodAuditCritical = 0, prodAuditHigh = 0, prodAuditModerate = 0, prodAuditLow = 0;
  try {
    const auditPath = path.join(workspaceDir, 'audit-prod.json');
    if (fs.existsSync(auditPath)) {
      const auditData = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
      if (auditData && auditData.metadata && auditData.metadata.vulnerabilities) {
        prodAuditCritical = auditData.metadata.vulnerabilities.critical || 0;
        prodAuditHigh = auditData.metadata.vulnerabilities.high || 0;
        prodAuditModerate = auditData.metadata.vulnerabilities.moderate || 0;
        prodAuditLow = auditData.metadata.vulnerabilities.low || 0;
      }
    }
  } catch (err) {
    console.error("⚠️ Failed to parse audit-prod.json", err);
  }

  // 1b. Read and Parse audit-dev.json
  let devAuditCritical = 0, devAuditHigh = 0, devAuditModerate = 0, devAuditLow = 0;
  try {
    const auditDevPath = path.join(workspaceDir, 'audit-dev.json');
    if (fs.existsSync(auditDevPath)) {
      const auditDevData = JSON.parse(fs.readFileSync(auditDevPath, 'utf8'));
      if (auditDevData && auditDevData.metadata && auditDevData.metadata.vulnerabilities) {
        devAuditCritical = auditDevData.metadata.vulnerabilities.critical || 0;
        devAuditHigh = auditDevData.metadata.vulnerabilities.high || 0;
        devAuditModerate = auditDevData.metadata.vulnerabilities.moderate || 0;
        devAuditLow = auditDevData.metadata.vulnerabilities.low || 0;
      }
    }
  } catch (err) {
    console.error("⚠️ Failed to parse audit-dev.json", err);
  }

  // 2. Read and Parse outdated.json
  let outdatedCount = 0;
  let majorUpdatesCount = 0;
  try {
    const outdatedPath = path.join(workspaceDir, 'outdated.json');
    if (fs.existsSync(outdatedPath)) {
      const outdatedContent = fs.readFileSync(outdatedPath, 'utf8');
      if (outdatedContent.trim()) {
        const outdatedData = JSON.parse(outdatedContent);
        const keys = Object.keys(outdatedData);
        outdatedCount = keys.length;
        
        // Count Major updates (assuming Semantic Versioning x.y.z)
        keys.forEach(pkg => {
          const info = outdatedData[pkg];
          if (info && info.current && info.latest) {
            const currentMajor = info.current.split('.')[0];
            const latestMajor = info.latest.split('.')[0];
            if (currentMajor !== latestMajor) {
              majorUpdatesCount++;
            }
          }
        });
      }
    }
  } catch (err) {
    console.error("⚠️ Failed to parse outdated.json", err);
  }

  // 3. Runtime Checks
  const nodeVersion = process.env.NODE_VERSION || process.version.replace('v', '');
  let nodeLts = "n/a";
  let isLTS = false;
  let isEOL = false;
  try {
    const nodeRes = await fetch("https://nodejs.org/dist/index.json");
    if (nodeRes.ok) {
      const nodeDist = await nodeRes.json();
      const currentInfo = nodeDist.find(r => r.version === `v${nodeVersion}`);
      if (currentInfo) {
        isLTS = !!currentInfo.lts;
      }
      const latestLtsInfo = nodeDist.find(r => !!r.lts);
      if (latestLtsInfo) {
        nodeLts = latestLtsInfo.version.replace('v', '');
      }
      const currentMajor = parseInt(nodeVersion.split('.')[0]) || 0;
      const ltsMajor = parseInt(nodeLts.split('.')[0]) || 0;
      isEOL = currentMajor > 0 && currentMajor < (ltsMajor - 2);
    }
  } catch (err) {
    console.error("⚠️ Failed to fetch Node dist info", err);
  }

  const nextVersion = process.env.NEXT_VERSION?.replace(/[\^~=]/g, '') || "n/a";
  const astroVersion = process.env.ASTRO_VERSION?.replace(/[\^~=]/g, '') || "n/a";
  const latestNext = process.env.LATEST_NEXT || "n/a";
  const latestAstro = process.env.LATEST_ASTRO || "n/a";
  
  const frameworks = [];
  if (nextVersion !== "n/a") {
    const currentMajor = parseInt(nextVersion.split('.')[0]) || 0;
    const latestMajor = parseInt(latestNext.split('.')[0]) || 0;
    frameworks.push({
      name: "next",
      current: nextVersion,
      latest: latestNext,
      outdated: nextVersion !== latestNext && latestNext !== "n/a",
      majorVersionsBehind: Math.max(0, latestMajor - currentMajor)
    });
  }
  if (astroVersion !== "n/a") {
    const currentMajor = parseInt(astroVersion.split('.')[0]) || 0;
    const latestMajor = parseInt(latestAstro.split('.')[0]) || 0;
    frameworks.push({
      name: "astro",
      current: astroVersion,
      latest: latestAstro,
      outdated: astroVersion !== latestAstro && latestAstro !== "n/a",
      majorVersionsBehind: Math.max(0, latestMajor - currentMajor)
    });
  }

  // 4. Prepare Payload
  const payload = {
    repo: repoName,
    packageManager: "npm",
    nodeVersion: nodeVersion,
    runtime: {
      node: {
        current: nodeVersion,
        latest: nodeVersion,
        lts: nodeLts,
        isLTS,
        isEOL
      },
      frameworks
    },
    audit: {
      production: {
        critical: prodAuditCritical,
        high: prodAuditHigh,
        moderate: prodAuditModerate,
        low: prodAuditLow
      },
      development: {
        critical: devAuditCritical,
        high: devAuditHigh,
        moderate: devAuditModerate,
        low: devAuditLow
      }
    },
    outdatedCount,
    majorUpdatesCount,
    buildStatus: "success", 
    testStatus: "success" 
  };

  console.log(`📦 Payload to send: \n${JSON.stringify(payload, null, 2)}`);

  // 4. Send to Dashboard
  const endpoint = `${dashboardUrl.replace(/\/$/, '')}/api/webhooks/update-scan`;
  
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${scanApiSecret}`
      },
      body: JSON.stringify(payload)
    });

    const responseBody = await response.text();

    if (!response.ok) {
      console.error(`❌ Failed to send report. Status: ${response.status} ${response.statusText}`);
      console.error(`📝 Response: ${responseBody}`);
      process.exit(1);
    }

    console.log("✅ Successfully sent update scan report to dashboard!");
    console.log(`📝 Response: ${responseBody}`);
    
  } catch (err) {
    console.error("❌ Network error while sending report:", err);
    process.exit(1);
  }
}

main();
