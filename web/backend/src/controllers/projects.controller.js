const ProjectsModel = require('../models/projects.model')
const supabase = require('../config/supabase')
const { v4: uuidv4 } = require('uuid')

const getItems = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      visibility: req.query.visibility,
      approval_status: req.query.approval_status,
      search: req.query.search,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
    }
    const data = await ProjectsModel.getAll(filters)
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const getItem = async (req, res) => {
  try {
    const project = await ProjectsModel.getById(req.params.id)
    if (!project) return res.status(404).json({ error: 'Project not found.' })
    res.json(project)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const createItem = async (req, res) => {
  try {
    // Log request metadata for debugging
    console.log('projects.create headers:', req.headers && req.headers['content-type'])
    console.log('projects.create body type:', typeof req.body)
    console.log('projects.create body keys:', req.body && Object.keys(req.body))
    if (req.body && req.body.image) console.log('projects.create image type:', typeof req.body.image)
    
    // 1. Upload the file to the bucket if file is provided
    if (req.file && req.file.buffer) {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-images')
        .upload(`public/${Date.now()}-${req.file.originalname}`, req.file.buffer, {
          contentType: req.file.mimetype,
        });

      if (uploadError) {
        console.error('Supabase storage upload error:', uploadError.message);
        return res.status(400).json({ error: 'Failed to upload image' });
      }

      // 2. Retrieve the absolute public URL (be tolerant of different return shapes)
      const { data: urlData } = supabase.storage
        .from('project-images')
        .getPublicUrl(uploadData.path);

      const publicUrl = urlData?.publicUrl || urlData?.publicURL || null;
      // Add URL to request body
      req.body.image = publicUrl;
    }
    
    // 3. Insert into the database
    const item = await ProjectsModel.create(req.body)
    res.status(201).json(item)
  } catch (err) {
    console.error('projects.create error:', err && err.stack ? err.stack : err)
    if (err && err.status) return res.status(err.status).json({ error: err.message })
    res.status(500).json({ error: err.message || 'Internal Server Error' })
  }
}

const updateItem = async (req, res) => {
  try {
    const item = await ProjectsModel.updateById(req.params.id, req.body)
    res.json(item)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const deleteItem = async (req, res) => {
  try {
    await ProjectsModel.deleteById(req.params.id)
    res.json({ deleted: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const deleteMany = async (req, res) => {
  try {
    const { ids } = req.body
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: 'ids must be an array.' })
    }
    const data = await ProjectsModel.deleteMany(ids)
    res.json({ deleted: data.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const uploadImage = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) return res.status(400).json({ error: 'No file uploaded' })
    const bucket = 'project-images'
    const filename = `${uuidv4()}-${req.file.originalname}`
    const { data, error } = await supabase.storage.from(bucket).upload(filename, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false,
    })
    if (error) {
      console.error('Supabase storage upload error:', error)
      return res.status(500).json({ error: error.message || 'Storage upload failed' })
    }
    const { data: urlData } = await supabase.storage.from(bucket).getPublicUrl(filename)
    const publicUrl = urlData?.publicUrl || null
    return res.json({ url: publicUrl })
  } catch (err) {
    console.error('uploadImage error:', err && err.stack ? err.stack : err)
    return res.status(500).json({ error: 'Upload failed' })
  }
}

module.exports = {
  getItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
  deleteMany,
  uploadImage,
}
