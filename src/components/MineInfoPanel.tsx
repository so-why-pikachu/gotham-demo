import { useState } from 'react';
import { ChevronRight, X } from './Icons';

export interface MineLocationSummary {
  id: string;
  name: string;
  region: string;
  mineType: string;
  longitude: number;
  latitude: number;
  markerColor: string;
}

type InfoTab = 'situations' | 'ops' | 'data';

type MineBrief = {
  subtitle: string;
  created: string;
  updated: string;
  severity: string;
  details: Record<InfoTab, string>;
  activity: string;
  response: string;
  intelligence: string;
};

const MINE_BRIEFS: Record<string, MineBrief> = {
  'yulong-mine': {
    subtitle: 'YULONG MINE · 西藏',
    created: '2024-09-12',
    updated: '刚刚',
    severity: 'ACTIVE',
    details: {
      situations:
        '玉龙矿区处于正常生产状态。当前设备、运输路线和现场监测点均已接入实时态势视图。',
      ops: '矿区生产单元正在运行，重点关注矿卡路线、边坡和能源消耗变化。',
      data: '已接入实时设备流、地形数据、路线采样和矿区基础档案。',
    },
    activity: '查看当前矿区设备活动、运输路线和生产单元状态。',
    response: '可从玉龙矿区 Workspace 继续查看对象列表与 Inspector 详情。',
    intelligence: '西藏 · 铜矿 · 97.729167°E 31.408333°N',
  },
  'haerwusu-mine': {
    subtitle: 'HAERWUSU OPEN-PIT MINE · 内蒙古',
    created: '2024-09-08',
    updated: '6 分钟前',
    severity: 'MONITORING',
    details: {
      situations: '哈尔乌素露天煤矿处于监测状态，当前未发现需要升级处理的异常。',
      ops: '大型露天煤矿，建议关注采掘区域、运输设备和生产节拍。',
      data: '位置数据来自矿区点位目录，详细设备数据尚未接入。',
    },
    activity: '当前仅保留矿区级别的态势点位。',
    response: '可继续扩展为独立运营 Workspace。',
    intelligence: '内蒙古 · 大型露天煤矿 · 111.258324°E 39.731044°N',
  },
  'antaibao-mine': {
    subtitle: 'ANTAIBAO OPEN-PIT MINE · 山西',
    created: '2024-09-05',
    updated: '18 分钟前',
    severity: 'MONITORING',
    details: {
      situations: '平朔安太堡露天煤矿已在全国概览中标记，等待进一步业务数据关联。',
      ops: '当前展示矿区级实体，暂无设备级运行状态。',
      data: '已登记矿区位置、所在区域和矿种信息。',
    },
    activity: '暂无新的设备活动记录。',
    response: '可从档案库关联地质报告、运营记录和安全规程。',
    intelligence: '山西 · 大型露天煤矿 · 112.337930°E 39.466011°N',
  },
  'zhujia-baobao-mine': {
    subtitle: 'ZHUJIA BAOBAO MINE · 四川',
    created: '2024-08-28',
    updated: '32 分钟前',
    severity: 'REVIEW',
    details: {
      situations: '攀枝花朱家包包铁矿处于资料复核状态，建议结合现场数据进行判断。',
      ops: '钒钛磁铁矿 / 铁矿，当前暂未接入设备级运营流。',
      data: '基础数据已登记，后续可关联地质与环境评估文档。',
    },
    activity: '暂无实时设备活动。',
    response: '建议打开资料库查看相关地质报告和环境评估。',
    intelligence: '四川 · 钒钛磁铁矿 / 铁矿 · 101.753610°E 26.633060°N',
  },
};

function getMineBrief(mine: MineLocationSummary): MineBrief {
  return MINE_BRIEFS[mine.id] ?? {
    subtitle: `${mine.name} · ${mine.region}`,
    created: '未记录',
    updated: '未知',
    severity: 'MONITORING',
    details: {
      situations: `${mine.name} 已在 Global Overview 中被选中。`,
      ops: '暂无运营数据。',
      data: `${mine.region} · ${mine.mineType}`,
    },
    activity: '暂无活动记录。',
    response: '暂无响应计划。',
    intelligence: `${mine.longitude}°E ${mine.latitude}°N`,
  };
}

export default function MineInfoPanel({
  mine,
  onClose,
}: {
  mine: MineLocationSummary;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<InfoTab>('situations');
  const [expandedSection, setExpandedSection] = useState('details');
  const brief = getMineBrief(mine);

  const toggleSection = (section: string) => {
    setExpandedSection((current) => (current === section ? '' : section));
  };

  return (
    <aside className="mine-info-panel" aria-label={`${mine.name} 信息面板`}>
      <div className="mine-info-tabs">
        <button
          className={`mine-info-tab ${activeTab === 'situations' ? 'active' : ''}`}
          type="button"
          onClick={() => setActiveTab('situations')}
        >
          <span className="info-tab-icon">●</span>
          Situations
        </button>
        <button
          className={`mine-info-tab ${activeTab === 'ops' ? 'active' : ''}`}
          type="button"
          onClick={() => setActiveTab('ops')}
        >
          <span className="info-tab-icon">✓</span>
          Ops
        </button>
        <button
          className={`mine-info-tab ${activeTab === 'data' ? 'active' : ''}`}
          type="button"
          onClick={() => setActiveTab('data')}
        >
          <span className="info-tab-icon">▱</span>
          Data
        </button>
      </div>

      <div className="mine-info-body">
        <div className="mine-info-heading-row">
          <button className="mine-info-back" type="button" onClick={onClose}>
            <ChevronRight size={15} className="mine-info-back-icon" />
            <span>Global Overview</span>
          </button>
          <button className="mine-info-close" type="button" onClick={onClose} aria-label="关闭信息面板">
            <X size={15} />
          </button>
        </div>

        <div className="mine-info-title-block">
          <h2>{mine.name}</h2>
          <p>{brief.subtitle}</p>
        </div>

        <div className="mine-info-meta">
          <div>
            <span>Created</span>
            <strong>{brief.created}</strong>
          </div>
          <div>
            <span>Last Edited</span>
            <strong>{brief.updated}</strong>
          </div>
          <div>
            <span>Severity</span>
            <strong className={`mine-severity ${brief.severity.toLowerCase()}`}>
              {brief.severity}
            </strong>
          </div>
        </div>

        <section className="mine-info-section">
          <button
            className={`mine-info-section-toggle ${expandedSection === 'details' ? 'expanded' : ''}`}
            type="button"
            onClick={() => toggleSection('details')}
          >
            <ChevronRight size={14} className="section-chevron" />
            <span>Details</span>
          </button>
          {expandedSection === 'details' && (
            <p className="mine-info-details">{brief.details[activeTab]}</p>
          )}
        </section>

        <section className="mine-info-section">
          <button
            className={`mine-info-section-toggle ${expandedSection === 'activity' ? 'expanded' : ''}`}
            type="button"
            onClick={() => toggleSection('activity')}
          >
            <ChevronRight size={14} className="section-chevron" />
            <span>Possible Site Activity</span>
          </button>
          {expandedSection === 'activity' && (
            <p className="mine-info-details">{brief.activity}</p>
          )}
        </section>

        <section className="mine-info-section">
          <button
            className={`mine-info-section-toggle ${expandedSection === 'response' ? 'expanded' : ''}`}
            type="button"
            onClick={() => toggleSection('response')}
          >
            <ChevronRight size={14} className="section-chevron" />
            <span>Response Plans</span>
          </button>
          {expandedSection === 'response' && (
            <p className="mine-info-details">{brief.response}</p>
          )}
        </section>

        <section className="mine-info-section">
          <button
            className={`mine-info-section-toggle ${expandedSection === 'intelligence' ? 'expanded' : ''}`}
            type="button"
            onClick={() => toggleSection('intelligence')}
          >
            <ChevronRight size={14} className="section-chevron" />
            <span>Intelligence Details</span>
          </button>
          {expandedSection === 'intelligence' && (
            <p className="mine-info-details">{brief.intelligence}</p>
          )}
        </section>
      </div>
    </aside>
  );
}
