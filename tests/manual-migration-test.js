/**
 * Manual Migration Test Script
 * 
 * This script can be run in the browser console to test migration functionality.
 * It creates some test bookmarks in generic folders and then tests the migration workflow.
 * 
 * Usage:
 * 1. Load the extension in Chrome
 * 2. Open the Developer Tools console
 * 3. Copy and paste this script
 * 4. Run: await testMigrationWorkflow()
 */

// Import migration functions (adjust path if needed)
async function loadMigrationModule() {
  try {
    return await import('../utils/migration.js');
  } catch (error) {
    console.error('Failed to load migration module:', error);
    console.log('Trying alternative import path...');
    return await import('chrome-extension://' + chrome.runtime.id + '/utils/migration.js');
  }
}

/**
 * Creates test bookmarks in generic folders for migration testing
 */
async function createTestBookmarks() {
  console.log('Creating test bookmarks...');
  
  try {
    // Create AI folder with test bookmark
    const aiFolder = await chrome.bookmarks.create({
      parentId: '1', // Bookmarks bar
      title: 'AI'
    });
    
    await chrome.bookmarks.create({
      parentId: aiFolder.id,
      title: 'OpenAI ChatGPT',
      url: 'https://chat.openai.com'
    });
    
    // Create Tech folder with test bookmark
    const techFolder = await chrome.bookmarks.create({
      parentId: '1',
      title: 'Tech'
    });
    
    await chrome.bookmarks.create({
      parentId: techFolder.id,
      title: 'TechCrunch',
      url: 'https://techcrunch.com'
    });
    
    // Create Programming folder with test bookmark
    const programmingFolder = await chrome.bookmarks.create({
      parentId: '1',
      title: 'Programming'
    });
    
    await chrome.bookmarks.create({
      parentId: programmingFolder.id,
      title: 'GitHub',
      url: 'https://github.com'
    });
    
    console.log('✅ Test bookmarks created successfully');
    return { aiFolder, techFolder, programmingFolder };
    
  } catch (error) {
    console.error('❌ Failed to create test bookmarks:', error);
    throw error;
  }
}

/**
 * Cleans up test bookmarks
 */
async function cleanupTestBookmarks(folders) {
  console.log('Cleaning up test bookmarks...');
  
  try {
    for (const folder of Object.values(folders)) {
      await chrome.bookmarks.removeTree(folder.id);
    }
    console.log('✅ Test bookmarks cleaned up');
  } catch (error) {
    console.error('❌ Failed to cleanup test bookmarks:', error);
  }
}

/**
 * Tests the migration proposal generation
 */
async function testMigrationProposals() {
  console.log('\n=== Testing Migration Proposals ===');
  
  const migration = await loadMigrationModule();
  
  try {
    const proposals = await migration.proposeBookmarkMoves();
    
    console.log(`Found ${proposals.length} migration proposals:`);
    
    proposals.forEach((proposal, index) => {
      console.log(`\n${index + 1}. "${proposal.bookmarkTitle}"`);
      console.log(`   URL: ${proposal.bookmarkUrl}`);
      console.log(`   FROM: ${proposal.originalFolderPath}`);
      console.log(`   TO: ${proposal.newSuggestedFolderPath} (${Math.round(proposal.confidence * 100)}% confidence)`);
    });
    
    return proposals;
    
  } catch (error) {
    console.error('❌ Failed to test migration proposals:', error);
    throw error;
  }
}

/**
 * Tests the complete migration workflow
 */
async function testMigrationWorkflow() {
  console.log('\n🚀 Starting Migration Test Workflow\n');
  
  let testFolders = null;
  
  try {
    // Step 1: Create test bookmarks
    testFolders = await createTestBookmarks();
    
    // Step 2: Wait a moment for bookmarks to be indexed
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 3: Test proposal generation
    const proposals = await testMigrationProposals();
    
    if (proposals.length === 0) {
      console.log('ℹ️ No migration proposals found. This might be expected if:');
      console.log('  - Bookmarks are already in hierarchical folders');
      console.log('  - AI provider is not available');
      console.log('  - Generic folder names are not in the predefined list');
      return;
    }
    
    // Step 4: Test migration execution (with user confirmation)
    const shouldExecute = confirm(`Found ${proposals.length} migration proposals. Execute migration? (This will actually move bookmarks)`);
    
    if (shouldExecute) {
      console.log('\n=== Executing Migration ===');
      const migration = await loadMigrationModule();
      const results = await migration.executeMigration(proposals);
      
      console.log(`\n✅ Migration completed:`);
      console.log(`   Successful: ${results.successful}`);
      console.log(`   Failed: ${results.failed}`);
      
      if (results.errors.length > 0) {
        console.log('   Errors:');
        results.errors.forEach(error => console.log(`     - ${error}`));
      }
    } else {
      console.log('ℹ️ Migration execution skipped by user');
    }
    
    // Step 5: Verify bookmark structure
    console.log('\n=== Final Bookmark Structure ===');
    await displayBookmarkStructure();
    
    console.log('\n🎉 Migration test completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration test failed:', error);
  } finally {
    // Cleanup
    if (testFolders && confirm('Clean up test bookmarks?')) {
      await cleanupTestBookmarks(testFolders);
    }
  }
}

/**
 * Displays the current bookmark structure for verification
 */
async function displayBookmarkStructure() {
  try {
    const tree = await chrome.bookmarks.getTree();
    
    function printNode(node, indent = '') {
      if (node.url) {
        console.log(`${indent}📄 ${node.title} (${node.url})`);
      } else {
        console.log(`${indent}📁 ${node.title}`);
        if (node.children) {
          node.children.forEach(child => printNode(child, indent + '  '));
        }
      }
    }
    
    console.log('Current bookmark structure:');
    tree[0].children.forEach(child => printNode(child));
    
  } catch (error) {
    console.error('Failed to display bookmark structure:', error);
  }
}

/**
 * Tests the console review mechanism
 */
async function testConsoleReview() {
  console.log('\n=== Testing Console Review Mechanism ===');
  
  const migration = await loadMigrationModule();
  
  const mockProposals = [
    {
      bookmarkId: 'test1',
      bookmarkTitle: 'Test Bookmark 1',
      bookmarkUrl: 'https://example.com',
      originalFolderPath: 'AI',
      newSuggestedFolderPath: 'Tech/AI/Machine Learning',
      confidence: 0.85
    },
    {
      bookmarkId: 'test2',
      bookmarkTitle: 'Test Bookmark 2',
      bookmarkUrl: 'https://example2.com',
      originalFolderPath: 'Programming',
      newSuggestedFolderPath: 'Development/JavaScript/Frameworks',
      confidence: 0.92
    }
  ];
  
  const approved = await migration.consoleReviewMechanism(mockProposals);
  
  console.log(`Console review approved ${approved.length} out of ${mockProposals.length} proposals`);
  return approved;
}

// Expose functions globally for console usage
window.migrationTest = {
  testMigrationWorkflow,
  testMigrationProposals,
  testConsoleReview,
  createTestBookmarks,
  cleanupTestBookmarks,
  displayBookmarkStructure
};

console.log('🔧 Migration test functions loaded. Available commands:');
console.log('  await migrationTest.testMigrationWorkflow() - Run complete test');
console.log('  await migrationTest.testMigrationProposals() - Test proposal generation only');
console.log('  await migrationTest.testConsoleReview() - Test console review mechanism');
console.log('  await migrationTest.displayBookmarkStructure() - Show current bookmarks');
console.log('  await migrationTest.createTestBookmarks() - Create test bookmarks');
console.log('  await migrationTest.cleanupTestBookmarks(folders) - Remove test bookmarks'); 