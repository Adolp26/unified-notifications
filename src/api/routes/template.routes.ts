import { Router } from 'express';
import { TemplateController } from '../controllers/template.controller';

const router = Router();
const controller = new TemplateController();

/**
 * @route   POST /api/v1/templates
 * @desc    Create a new template
 * @access  Public (adicionar auth depois)
 */
router.post('/', controller.create);

/**
 * @route   GET /api/v1/templates
 * @desc    Get all templates
 * @access  Public
 */
router.get('/', controller.findAll);

/**
 * @route   GET /api/v1/templates/:id
 * @desc    Get template by ID
 * @access  Public
 */
router.get('/:id', controller.findById);

/**
 * @route   PUT /api/v1/templates/:id
 * @desc    Update template
 * @access  Public
 */
router.put('/:id', controller.update);

/**
 * @route   DELETE /api/v1/templates/:id
 * @desc    Delete template
 * @access  Public
 */
router.delete('/:id', controller.delete);

export default router;