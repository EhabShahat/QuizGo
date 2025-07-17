const express = require('express');
const { supabaseService } = require('../services/supabaseService');
const router = express.Router();

// Get all quizzes (with pagination)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, hostId } = req.query;
    const offset = (page - 1) * limit;

    let query = supabaseService.client
      .from('quizzes')
      .select(`
        *,
        quiz_items (count)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (hostId) {
      query = query.eq('host_id', hostId);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    const quizzes = data?.map(quiz => ({
      ...quiz,
      question_count: quiz.quiz_items?.[0]?.count || 0,
    })) || [];

    res.json({
      success: true,
      data: quizzes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit),
      },
    });

  } catch (error) {
    console.error('Error getting quizzes:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve quizzes',
    });
  }
});

// Get quiz by ID
router.get('/:quizId', async (req, res) => {
  try {
    const { quizId } = req.params;

    const quiz = await supabaseService.getQuiz(quizId);

    if (!quiz) {
      return res.status(404).json({
        error: 'Quiz not found',
        message: 'The specified quiz does not exist',
      });
    }

    res.json({
      success: true,
      data: quiz,
    });

  } catch (error) {
    console.error('Error getting quiz:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve quiz',
    });
  }
});

// Create new quiz
router.post('/', async (req, res) => {
  try {
    const {
      title,
      description,
      hostId,
      backgroundType = 'gradient',
      backgroundValue,
      backgroundOverlay = true,
      overlayOpacity = 0.4,
    } = req.body;

    if (!title || !hostId) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Title and host ID are required',
      });
    }

    const quizData = {
      title: title.trim(),
      description: description?.trim() || null,
      host_id: hostId,
      background_type: backgroundType,
      background_value: backgroundValue,
      background_overlay: backgroundOverlay,
      overlay_opacity: overlayOpacity,
    };

    const quiz = await supabaseService.createQuiz(quizData);

    res.status(201).json({
      success: true,
      data: quiz,
    });

  } catch (error) {
    console.error('Error creating quiz:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create quiz',
    });
  }
});

// Update quiz
router.put('/:quizId', async (req, res) => {
  try {
    const { quizId } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated
    delete updates.id;
    delete updates.host_id;
    delete updates.created_at;

    // Add updated timestamp
    updates.updated_at = new Date().toISOString();

    const updatedQuiz = await supabaseService.updateQuiz(quizId, updates);

    if (!updatedQuiz) {
      return res.status(404).json({
        error: 'Quiz not found',
        message: 'The specified quiz does not exist',
      });
    }

    res.json({
      success: true,
      data: updatedQuiz,
    });

  } catch (error) {
    console.error('Error updating quiz:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update quiz',
    });
  }
});

// Delete quiz
router.delete('/:quizId', async (req, res) => {
  try {
    const { quizId } = req.params;

    const success = await supabaseService.deleteQuiz(quizId);

    if (!success) {
      return res.status(404).json({
        error: 'Quiz not found',
        message: 'The specified quiz does not exist',
      });
    }

    res.json({
      success: true,
      message: 'Quiz deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting quiz:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete quiz',
    });
  }
});

// Create quiz item (question or slide)
router.post('/:quizId/items', async (req, res) => {
  try {
    const { quizId } = req.params;
    const {
      itemType = 'question',
      questionType = 'multiple_choice',
      orderIndex,
      title,
      content,
      mediaUrl,
      mediaType,
      fontSize = 'auto',
      isScored = true,
      isDoublePoints = false,
      timeLimit = 30,
      points = 1000,
      presenterNotes,
      options = [],
    } = req.body;

    if (!content && itemType === 'question') {
      return res.status(400).json({
        error: 'Missing required field',
        message: 'Question content is required',
      });
    }

    const itemData = {
      quiz_id: quizId,
      item_type: itemType,
      question_type: questionType,
      order_index: orderIndex,
      title,
      content,
      media_url: mediaUrl,
      media_type: mediaType,
      font_size: fontSize,
      is_scored: isScored,
      is_double_points: isDoublePoints,
      time_limit: timeLimit,
      points,
      presenter_notes: presenterNotes,
    };

    const item = await supabaseService.createQuizItem(itemData);

    // Create options if provided
    if (options.length > 0 && itemType === 'question') {
      await supabaseService.createQuizItemOptions(item.id, options);
    }

    // Get the complete item with options
    const completeItem = await supabaseService.client
      .from('quiz_items')
      .select(`
        *,
        quiz_item_options (*)
      `)
      .eq('id', item.id)
      .single();

    res.status(201).json({
      success: true,
      data: completeItem.data,
    });

  } catch (error) {
    console.error('Error creating quiz item:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create quiz item',
    });
  }
});

// Update quiz item
router.put('/:quizId/items/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { options, ...updates } = req.body;

    // Remove fields that shouldn't be updated
    delete updates.id;
    delete updates.quiz_id;
    delete updates.created_at;

    // Add updated timestamp
    updates.updated_at = new Date().toISOString();

    const updatedItem = await supabaseService.updateQuizItem(itemId, updates);

    // Update options if provided
    if (options && Array.isArray(options)) {
      await supabaseService.updateQuizItemOptions(itemId, options);
    }

    // Get the complete item with options
    const completeItem = await supabaseService.client
      .from('quiz_items')
      .select(`
        *,
        quiz_item_options (*)
      `)
      .eq('id', itemId)
      .single();

    res.json({
      success: true,
      data: completeItem.data,
    });

  } catch (error) {
    console.error('Error updating quiz item:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update quiz item',
    });
  }
});

// Delete quiz item
router.delete('/:quizId/items/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;

    const success = await supabaseService.deleteQuizItem(itemId);

    if (!success) {
      return res.status(404).json({
        error: 'Quiz item not found',
        message: 'The specified quiz item does not exist',
      });
    }

    res.json({
      success: true,
      message: 'Quiz item deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting quiz item:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete quiz item',
    });
  }
});

// Reorder quiz items
router.put('/:quizId/items/reorder', async (req, res) => {
  try {
    const { quizId } = req.params;
    const { itemOrders } = req.body;

    if (!Array.isArray(itemOrders)) {
      return res.status(400).json({
        error: 'Invalid data',
        message: 'itemOrders must be an array',
      });
    }

    const updatedItems = await supabaseService.reorderQuizItems(quizId, itemOrders);

    res.json({
      success: true,
      data: updatedItems,
      message: 'Quiz items reordered successfully',
    });

  } catch (error) {
    console.error('Error reordering quiz items:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to reorder quiz items',
    });
  }
});

// Upload media for quiz
router.post('/:quizId/media', async (req, res) => {
  try {
    const { quizId } = req.params;
    const { file, fileName, fileType } = req.body;

    if (!file || !fileName) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'File and fileName are required',
      });
    }

    // Generate unique file path
    const timestamp = Date.now();
    const filePath = `quizzes/${quizId}/${timestamp}_${fileName}`;

    // Upload to Supabase Storage
    const uploadResult = await supabaseService.uploadFile('quiz-media', filePath, file);

    if (!uploadResult) {
      throw new Error('Failed to upload file');
    }

    // Get public URL
    const publicUrl = await supabaseService.getFileUrl('quiz-media', filePath);

    res.json({
      success: true,
      data: {
        fileName,
        filePath,
        publicUrl,
        fileType,
        uploadedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Error uploading media:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to upload media',
    });
  }
});

// Get recent quizzes for host
router.get('/host/:hostId/recent', async (req, res) => {
  try {
    const { hostId } = req.params;
    const { limit = 5 } = req.query;

    const quizzes = await supabaseService.getRecentQuizzes(hostId, parseInt(limit));

    res.json({
      success: true,
      data: quizzes,
    });

  } catch (error) {
    console.error('Error getting recent quizzes:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve recent quizzes',
    });
  }
});

// Get dashboard stats for host
router.get('/host/:hostId/stats', async (req, res) => {
  try {
    const { hostId } = req.params;

    const stats = await supabaseService.getDashboardStats(hostId);

    res.json({
      success: true,
      data: stats,
    });

  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve dashboard stats',
    });
  }
});

module.exports = router;