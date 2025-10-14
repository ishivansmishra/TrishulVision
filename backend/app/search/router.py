from fastapi import APIRouter, Depends, Query
from ..mongo import get_db
from typing import Any, Dict, List

router = APIRouter()


@router.get("")
async def search(
	q: str = Query(default="", description="Search query"),
	limit: int = Query(default=20, ge=1, le=100),
	db = Depends(get_db),
):
	"""Simple search over key collections in Mongo.
	Placeholder for Meilisearch/Elasticsearch integration; uses regex contains on text-ish fields.
	"""
	term = (q or "").strip()
	if not term:
		return {"query": q, "results": []}

	results: List[Dict[str, Any]] = []
	try:
		# mining_reports by id and summary/notes
		cursor = db.get_collection('mining_reports').find({
			'$or': [
				{'_id': {'$regex': term, '$options': 'i'}},
				{'result.summary': {'$regex': term, '$options': 'i'}},
				{'notes': {'$regex': term, '$options': 'i'}},
			]
		}).limit(limit)
		async for d in cursor:
			results.append({ 'type': 'report', 'id': str(d.get('_id')), 'status': d.get('status'), 'summary': (d.get('result') or {}).get('summary') })
	except Exception:
		pass
	try:
		# detection_jobs by id and notes
		cursor = db.get_collection('detection_jobs').find({
			'$or': [
				{'_id': {'$regex': term, '$options': 'i'}},
				{'notes': {'$regex': term, '$options': 'i'}},
				{'user_email': {'$regex': term, '$options': 'i'}},
			]
		}).limit(limit)
		async for d in cursor:
			results.append({ 'type': 'detection_job', 'id': str(d.get('_id')), 'status': d.get('status') })
	except Exception:
		pass
	try:
		# shapefiles by name
		cursor = db.get_collection('shapefiles').find({'name': {'$regex': term, '$options': 'i'}}).limit(limit)
		async for d in cursor:
			results.append({ 'type': 'shapefile', 'id': str(d.get('_id')), 'name': d.get('name') })
	except Exception:
		pass
	return { 'query': q, 'results': results[:limit] }
