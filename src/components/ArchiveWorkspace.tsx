import { useEffect, useState } from 'react';
import {useBusiness} from '../store/BusinessProvider';
import type {WorkspaceManagerAPI} from '../App';
import { Search, FileText, Folder, ChevronRight } from './Icons';

export default function ArchiveWorkspace({manager,params}:{manager:WorkspaceManagerAPI;params?:Record<string,unknown>}) {
  const {data}=useBusiness();
  const docs=data.documents.filter(d=>!params?.equipmentId||d.equipmentId===params.equipmentId);
  const categories=[...new Set(docs.map(d=>d.category))].map(name=>({id:name,name,count:docs.filter(d=>d.category===name).length}));
  const [query, setQuery] = useState('');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(()=>{setSelectedDocId(null);setActiveCategory(null);setQuery('');},[params?.equipmentId]);
  const filtered = docs.filter((d) => {
    const matchQuery = d.title.toLowerCase().includes(query.toLowerCase()) || d.id.toLowerCase().includes(query.toLowerCase());
    const matchCat = activeCategory ? d.category === activeCategory : true;
    return matchQuery && matchCat;
  });

  const selectedDoc = docs.find((d) => d.id === selectedDocId);

  return (
    <div className="workspace archive-workspace">
      <aside className="archive-sidebar">
        <div className="archive-search">
          <Search size={14} />
          <input
            type="text"
            placeholder="搜索档案…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="category-list">
          <button
            className={`category-row ${activeCategory === null ? 'active' : ''}`}
            onClick={() => setActiveCategory(null)}
          >
            <Folder size={14} />
            <span>全部文档</span>
            <ChevronRight size={12} />
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`category-row ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              <Folder size={14} />
              <span>{cat.name}</span>
              <span className="cat-count">{cat.count}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="archive-list">
        <div className="list-header">
          <span>FILE NUMBER</span>
          <span>标题</span>
          <span>日期</span>
          <span>分类</span>
        </div>
        {filtered.map((doc) => (
          <button
            key={doc.id}
            className={`list-row ${selectedDocId === doc.id ? 'selected' : ''}`}
            onClick={() => setSelectedDocId(doc.id)}
          >
            <span className="doc-id">{doc.id}</span>
            <span className="doc-title">
              <FileText size={14} />
              {doc.title}
            </span>
            <span className="doc-date">{doc.date}</span>
            <span className="doc-category">{doc.category}</span>
          </button>
        ))}
      </section>

      <section className="archive-preview">
        {selectedDoc ? (
          <div className="preview-body">
            <div className="preview-header">
              <span className="preview-id">{selectedDoc.id}</span>
              <h3>{selectedDoc.title}</h3>
            </div>
            <div className="preview-meta">
              <span>创建日期: {selectedDoc.date}</span>
              <span>分类: {selectedDoc.category}</span>
              <span>密级: 内部</span>
            </div>
            <div className="preview-content">
              <p>{selectedDoc.body}</p><button className="action-btn" onClick={()=>manager.openWorkspace('mine','玉龙矿区',{equipmentId:selectedDoc.equipmentId,mineId:'yulong-mine'})}>返回来源设备</button>
            </div>
          </div>
        ) : (
          <div className="preview-empty">
            <FileText size={32} />
            <p>选择一份文档以预览</p>
          </div>
        )}
      </section>
    </div>
  );
}
