import { jest } from '@jest/globals';
import { 
  proposeBookmarkMoves, 
  executeMigration, 
  performMigrationWorkflow,
  consoleReviewMechanism 
} from '../utils/migration.js';
import { parseCategoryPath } from '../utils/bookmark.js';

// Mock chrome.bookmarks API
const mockBookmarksTree = [
  {
    id: '0',
    title: '',
    children: [
      {
        id: '1',
        title: 'Bookmarks bar',
        children: [
          {
            id: '10',
            title: 'AI',
            children: [
              {
                id: '100',
                title: 'OpenAI Blog',
                url: 'https://openai.com/blog',
                parentId: '10'
              },
              {
                id: '101',
                title: 'General AI News',
                url: 'https://ainews.com',
                parentId: '10'
              }
            ]
          },
          {
            id: '11',
            title: 'Tech',
            children: [
              {
                id: '110',
                title: 'TechCrunch',
                url: 'https://techcrunch.com',
                parentId: '11'
              }
            ]
          },
          {
            id: '12',
            title: 'Programming',
            children: [
              {
                id: '120',
                title: 'JS Weekly',
                url: 'https://javascriptweekly.com',
                parentId: '12'
              }
            ]
          }
        ]
      }
    ]
  }
];

// Mock Chrome APIs for testing
const mockChrome = {
  bookmarks: {
    getTree: jest.fn(),
    move: jest.fn(),
    create: jest.fn()
  }
};

// Set up global chrome mock
global.chrome = mockChrome;

// Mock utils/api.js
jest.mock('../utils/api.js', () => ({
  getFolderPathFromLLM: jest.fn()
}));

// Mock logger
jest.mock('../utils/error/index.js', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

import { getFolderPathFromLLM } from '../utils/api.js';

describe('Migration Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('proposeBookmarkMoves', () => {
    it('should identify bookmarks in generic folders for migration', async () => {
      // Mock bookmark tree with bookmarks in generic folders
      const mockBookmarkTree = [{
        children: [{
          id: '1',
          title: 'Bookmarks bar',
          children: [{
            id: '10',
            title: 'AI',
            children: [{
              id: '100',
              title: 'Test Bookmark 1',
              url: 'https://example.com/ai-article',
              parentId: '10'
            }]
          }, {
            id: '11',
            title: 'Tech',
            children: [{
              id: '101',
              title: 'Test Bookmark 2',
              url: 'https://example.com/tech-news',
              parentId: '11'
            }]
          }]
        }]
      }];

      mockChrome.bookmarks.getTree.mockResolvedValue(mockBookmarkTree);

      // Mock LLM responses with hierarchical suggestions
      getFolderPathFromLLM
        .mockResolvedValueOnce([
          { folderPath: 'Tech/AI/Machine Learning', confidence: 0.85 }
        ])
        .mockResolvedValueOnce([
          { folderPath: 'Tech/Software/Development', confidence: 0.90 }
        ]);

      const proposals = await proposeBookmarkMoves();

      expect(proposals).toHaveLength(2);
      expect(proposals[0]).toMatchObject({
        bookmarkTitle: 'Test Bookmark 1',
        originalFolderPath: 'AI',
        newSuggestedFolderPath: 'Tech/AI/Machine Learning'
      });
      expect(proposals[1]).toMatchObject({
        bookmarkTitle: 'Test Bookmark 2',
        originalFolderPath: 'Tech',
        newSuggestedFolderPath: 'Tech/Software/Development'
      });
    });

    it('should not propose moves for already hierarchical bookmarks', async () => {
      const mockBookmarkTree = [{
        children: [{
          id: '1',
          title: 'Bookmarks bar',
          children: [{
            id: '10',
            title: 'Tech',
            children: [{
              id: '20',
              title: 'AI',
              children: [{
                id: '100',
                title: 'Test Bookmark',
                url: 'https://example.com',
                parentId: '20'
              }]
            }]
          }]
        }]
      }];

      mockChrome.bookmarks.getTree.mockResolvedValue(mockBookmarkTree);

      const proposals = await proposeBookmarkMoves();

      expect(proposals).toHaveLength(0);
      expect(getFolderPathFromLLM).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockChrome.bookmarks.getTree.mockRejectedValue(new Error('Chrome API error'));

      const proposals = await proposeBookmarkMoves();

      expect(proposals).toHaveLength(0);
    });
  });

  describe('executeMigration', () => {
    it('should successfully execute approved migrations', async () => {
      const approvedMoves = [{
        bookmarkId: '100',
        bookmarkTitle: 'Test Bookmark',
        bookmarkUrl: 'https://example.com',
        originalFolderPath: 'AI',
        newSuggestedFolderPath: 'Tech/AI/Machine Learning'
      }];

      // Mock findOrCreateFolder to return a folder ID
      const mockFindOrCreateFolder = jest.fn().mockResolvedValue('folder123');
      
      // Import the function we need to mock
      const migration = await import('../utils/migration.js');
      
      // Mock the bookmark move operation
      mockChrome.bookmarks.move.mockResolvedValue({});

      // Mock the findOrCreateFolder function
      jest.doMock('../utils/bookmark.js', () => ({
        parseCategoryPath: jest.requireActual('../utils/bookmark.js').parseCategoryPath,
        findOrCreateFolder: mockFindOrCreateFolder
      }));

      const results = await executeMigration(approvedMoves);

      expect(results.successful).toBe(1);
      expect(results.failed).toBe(0);
      expect(results.errors).toHaveLength(0);
      expect(mockChrome.bookmarks.move).toHaveBeenCalledWith('100', { parentId: 'folder123' });
    });

    it('should handle move failures gracefully', async () => {
      const approvedMoves = [{
        bookmarkId: '100',
        bookmarkTitle: 'Test Bookmark',
        bookmarkUrl: 'https://example.com',
        originalFolderPath: 'AI',
        newSuggestedFolderPath: 'Tech/AI/Machine Learning'
      }];

      mockChrome.bookmarks.move.mockRejectedValue(new Error('Move failed'));

      const results = await executeMigration(approvedMoves);

      expect(results.successful).toBe(0);
      expect(results.failed).toBe(1);
      expect(results.errors).toHaveLength(1);
      expect(results.errors[0]).toContain('Failed to move "Test Bookmark"');
    });
  });

  describe('performMigrationWorkflow', () => {
    it('should complete the full migration workflow', async () => {
      // Mock proposal generation
      const mockProposals = [{
        bookmarkId: '100',
        bookmarkTitle: 'Test Bookmark',
        bookmarkUrl: 'https://example.com',
        originalFolderPath: 'AI',
        newSuggestedFolderPath: 'Tech/AI/Machine Learning'
      }];

      // Mock the proposeBookmarkMoves function
      jest.doMock('../utils/migration.js', () => ({
        ...jest.requireActual('../utils/migration.js'),
        proposeBookmarkMoves: jest.fn().mockResolvedValue(mockProposals)
      }));

      // Mock user review function that approves all
      const mockUserReview = jest.fn().mockResolvedValue(mockProposals);

      const results = await performMigrationWorkflow(mockUserReview);

      expect(results.phase).toBe('complete');
      expect(results.proposals).toBe(1);
      expect(results.approved).toBe(1);
      expect(mockUserReview).toHaveBeenCalledWith(mockProposals);
    });

    it('should handle no proposals case', async () => {
      jest.doMock('../utils/migration.js', () => ({
        ...jest.requireActual('../utils/migration.js'),
        proposeBookmarkMoves: jest.fn().mockResolvedValue([])
      }));

      const mockUserReview = jest.fn();

      const results = await performMigrationWorkflow(mockUserReview);

      expect(results.phase).toBe('complete');
      expect(results.proposals).toBe(0);
      expect(results.message).toContain('No bookmarks need migration');
      expect(mockUserReview).not.toHaveBeenCalled();
    });

    it('should handle user cancellation', async () => {
      const mockProposals = [{
        bookmarkId: '100',
        bookmarkTitle: 'Test Bookmark',
        bookmarkUrl: 'https://example.com',
        originalFolderPath: 'AI',
        newSuggestedFolderPath: 'Tech/AI/Machine Learning'
      }];

      jest.doMock('../utils/migration.js', () => ({
        ...jest.requireActual('../utils/migration.js'),
        proposeBookmarkMoves: jest.fn().mockResolvedValue(mockProposals)
      }));

      // Mock user review function that approves none
      const mockUserReview = jest.fn().mockResolvedValue([]);

      const results = await performMigrationWorkflow(mockUserReview);

      expect(results.phase).toBe('cancelled');
      expect(results.proposals).toBe(1);
      expect(results.approved).toBe(0);
      expect(results.message).toContain('cancelled by user');
    });
  });

  describe('consoleReviewMechanism', () => {
    it('should auto-approve all proposals for testing', async () => {
      const mockProposals = [{
        bookmarkId: '100',
        bookmarkTitle: 'Test Bookmark',
        bookmarkUrl: 'https://example.com',
        originalFolderPath: 'AI',
        newSuggestedFolderPath: 'Tech/AI/Machine Learning',
        confidence: 0.85
      }];

      const approved = await consoleReviewMechanism(mockProposals);

      expect(approved).toEqual(mockProposals);
      expect(approved).toHaveLength(1);
    });
  });
});

describe('Integration Tests', () => {
  describe('Migration UI Integration', () => {
    it('should work with the MigrationController', async () => {
      const { MigrationController } = await import('../utils/business/migration-controller.js');
      
      const controller = new MigrationController();
      
      // Create a mock container element
      const mockContainer = {
        innerHTML: '',
        querySelector: jest.fn(),
        querySelectorAll: jest.fn().mockReturnValue([])
      };

      // Mock the proposeBookmarkMoves to return empty for UI test
      jest.doMock('../utils/migration.js', () => ({
        ...jest.requireActual('../utils/migration.js'),
        proposeBookmarkMoves: jest.fn().mockResolvedValue([])
      }));

      const result = await controller.startMigration(mockContainer);

      expect(result.phase).toBe('complete');
      expect(result.proposals).toBe(0);
      expect(mockContainer.innerHTML).toContain('No bookmarks need migration');
    });
  });
}); 