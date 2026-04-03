const recordService = require("../services/recordService");

async function list(req, res, next) {
  try {
    const result = await recordService.listRecords(req.query);
    res.json(result);
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const record = await recordService.getRecordById(req.params.id);
    res.json({ record });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const record = await recordService.createRecord(req.body, req.user.id);
    res.status(201).json({ record });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const record = await recordService.updateRecord(req.params.id, req.body, req.user);
    res.json({ record });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const deleted = await recordService.softDeleteRecord(req.params.id);
    res.json({ message: "Record deleted", deleted });
  } catch (err) { next(err); }
}

module.exports = { list, getOne, create, update, remove };
