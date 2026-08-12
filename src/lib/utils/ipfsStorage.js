/**
 * IPFS integration for Floorish
 * Decentralized storage for community catalogue sharing
 * Uses Helia (lightweight IPFS in JavaScript)
 */

let helia = null;
let json = null;
let ipfsReady = false;

/**
 * Initialize IPFS node
 */
export async function initIPFS() {
  if (ipfsReady) return { helia, json };

  try {
    // Dynamic imports for IPFS modules
    const { createHelia } = await import('helia');
    const { json: jsonModule } = await import('@helia/json');
    const { unixfs } = await import('@helia/unixfs');

    helia = await createHelia({
      // Use light configuration for browser
      libp2p: {
        transports: [] // Will use WebRTC and circuit relay
      }
    });

    json = jsonModule(helia);
    ipfsReady = true;

    console.log('IPFS node ready with ID:', helia.libp2p.peerId.toString());
    return { helia, json };
  } catch (err) {
    console.error('IPFS initialization failed:', err);
    throw err;
  }
}

/**
 * Upload furniture model data to IPFS
 * @param {Object} modelData - 3D model data
 * @param {Object} metadata - Item metadata (name, creator, licence, etc.)
 */
export async function uploadToIPFS(modelData, metadata) {
  const { json: ipfsJson } = await initIPFS();

  // Create the package
  const furniturePackage = {
    version: '1.0',
    type: 'floorish-furniture',
    timestamp: new Date().toISOString(),
    model: modelData,
    metadata: {
      name: metadata.name,
      creator: metadata.creator || 'anonymous',
      category: metadata.category || 'Other',
      licence: metadata.licence || 'CC0',
      tags: metadata.tags || [],
      dimensions: metadata.dimensions || { width: 1, height: 1, depth: 1 },
      thumbnail: metadata.thumbnail || null // base64 data URL
    }
  };

  // Add to IPFS
  const cid = await ipfsJson.add(furniturePackage);
  
  console.log('Uploaded to IPFS with CID:', cid.toString());
  
  return {
    cid: cid.toString(),
    url: `https://ipfs.io/ipfs/${cid.toString()}`,
    gateway: `https://${cid.toString()}.ipfs.dweb.link`
  };
}

/**
 * Download furniture model data from IPFS
 * @param {string} cid - IPFS Content Identifier
 */
export async function downloadFromIPFS(cid) {
  const { json: ipfsJson } = await initIPFS();

  try {
    const data = await ipfsJson.get(cid);
    return data;
  } catch (err) {
    // Fallback to public gateway
    return downloadFromGateway(cid);
  }
}

/**
 * Fallback: download from public IPFS gateway
 */
async function downloadFromGateway(cid) {
  const gateways = [
    `https://ipfs.io/ipfs/${cid}`,
    `https://cloudflare-ipfs.com/ipfs/${cid}`,
    `https://gateway.pinata.cloud/ipfs/${cid}`
  ];

  for (const gateway of gateways) {
    try {
      const response = await fetch(gateway);
      if (response.ok) {
        return await response.json();
      }
    } catch {
      continue;
    }
  }

  throw new Error('Failed to fetch from all IPFS gateways');
}

/**
 * Pin content to ensure it stays available
 * Uses a free pinning service
 */
export async function pinContent(cid) {
  try {
    // Use a free pinning service (e.g., web3.storage or Pinata)
    const response = await fetch('https://api.web3.storage/pins', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_WEB3_STORAGE_TOKEN || ''}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ cid })
    });

    if (response.ok) {
      console.log('Content pinned successfully:', cid);
      return true;
    }
  } catch (err) {
    console.warn('Pinning failed, content may not persist:', err.message);
  }
  
  return false;
}

/**
 * Get all catalogue items from IPFS
 * Uses a simple index stored on IPFS
 */
export async function getCatalogueIndex() {
  // This would be a known CID that points to the catalogue index
  const CATALOGUE_INDEX_CID = import.meta.env.VITE_CATALOGUE_CID || 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
  
  try {
    const index = await downloadFromIPFS(CATALOGUE_INDEX_CID);
    return index.items || [];
  } catch {
    // Return empty if index not available
    return [];
  }
}

/**
 * Add an item to the catalogue index
 */
export async function addToCatalogueIndex(item) {
  // In a real app, this would update the index on IPFS
  // For now, store locally and emit event
  const event = new CustomEvent('catalogue-updated', { detail: item });
  window.dispatchEvent(event);
  
  return { success: true, item };
}

/**
 * Create a shareable link for a furniture item
 */
export function createShareLink(cid) {
  return {
    ipfs: `ipfs://${cid}`,
    web: `https://ipfs.io/ipfs/${cid}`,
    dweb: `https://${cid}.ipfs.dweb.link`,
    // Short link using a service (would need backend)
    short: null
  };
}

/**
 * Stop the IPFS node
 */
export async function stopIPFS() {
  if (helia) {
    await helia.stop();
    ipfsReady = false;
    helia = null;
    json = null;
  }
}