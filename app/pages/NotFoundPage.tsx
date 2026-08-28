import { Link } from 'react-router-dom'
import { RandomHistoryButton } from '../../components/RandomHistoryButton'

export function NotFoundPage() { return <section className="not-found archive-grid"><div><span>ERROR / ARCHIVE 404</span><div className="not-found__seal">佚</div><h1>此卷佚失</h1><p>“此页未载于赛博史记。”</p><div><Link className="button button--ghost" to="/">返回史馆</Link><RandomHistoryButton /></div></div></section> }
