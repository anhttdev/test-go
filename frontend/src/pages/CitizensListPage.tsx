import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { deleteCitizen, listCitizens } from '../api/citizens'
import type { Citizen, CitizenListQuery } from '../lib/domain'
import { DEFAULT_CITIZEN_LIST_QUERY, getCitizenEmail } from '../lib/domain'
import { classNames } from '../lib/format'
import { Button, Card, Field, Select, TextInput } from '../ui/primitives'
import { useToast } from '../ui/toast'

function readQuery(params: URLSearchParams): CitizenListQuery {
  return {
    name: params.get('name') ?? '',
    maso: params.get('maso') ?? '',
    page: params.get('page') ?? DEFAULT_CITIZEN_LIST_QUERY.page,
    size: params.get('size') ?? DEFAULT_CITIZEN_LIST_QUERY.size,
    sort: (params.get('sort') === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc',
  }
}

export function CitizensListPage() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [draft, setDraft] = useState<CitizenListQuery>(() => readQuery(params))
  const [isLoading, setIsLoading] = useState(false)
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null)
  const [citizens, setCitizens] = useState<Citizen[]>([])

  const query = useMemo(() => readQuery(params), [params])

  const page = Number(query.page || '1')
  const size = Number(query.size || '10')
  const canPrev = page > 1
  const canNext = citizens.length === size

  useEffect(() => {
    queueMicrotask(() => setDraft(query))
  }, [query])

  async function load(current: CitizenListQuery) {
    setIsLoading(true)
    try {
      const payload = await listCitizens(current)
      setCitizens(payload)
    } catch (error) {
      toast.push({
        type: 'error',
        title: 'Tải danh sách thất bại',
        message: error instanceof Error ? error.message : 'Không thể tải danh sách công dân.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void load(query)
    })
  }, [query])

  function applyToUrl(next: CitizenListQuery) {
    const nextParams = new URLSearchParams()
    if (next.name.trim()) nextParams.set('name', next.name.trim())
    if (next.maso.trim()) nextParams.set('maso', next.maso.trim())
    nextParams.set('page', next.page || '1')
    nextParams.set('size', next.size || '10')
    nextParams.set('sort', next.sort)
    setParams(nextParams, { replace: true })
  }

  async function handleDelete(id?: number) {
    if (!id) return
    const ok = window.confirm(`Xoá hồ sơ ID ${id}? Thao tác không thể hoàn tác.`)
    if (!ok) return

    setIsDeletingId(id)
    try {
      await deleteCitizen(id)
      toast.push({ type: 'success', title: 'Xoá hồ sơ', message: `Đã xoá hồ sơ ID ${id}.` })
      await load(query)
    } catch (error) {
      toast.push({
        type: 'error',
        title: 'Xoá thất bại',
        message: error instanceof Error ? error.message : 'Không thể xoá hồ sơ.',
      })
    } finally {
      setIsDeletingId(null)
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">Danh sách công dân</div>
          <div className="page-subtitle">Tra cứu theo tên hoặc mã số (API v2).</div>
        </div>
        <div className="page-actions">
          <Link to="/app/citizens/new" className="btn btn-primary btn-md">
            Tạo hồ sơ
          </Link>
          <Button variant="default" onClick={() => void load(query)} loading={isLoading}>
            Tải mới
          </Button>
        </div>
      </div>

      <Card className="section-card">
        <div className="section-head">
          <div>
            <div className="section-title">Bộ lọc</div>
            <div className="section-subtitle">Dữ liệu trả về phụ thuộc backend phân trang.</div>
          </div>
        </div>

        <form
          className="filters"
          onSubmit={(event) => {
            event.preventDefault()
            applyToUrl({ ...draft, page: '1' })
          }}
        >
          <Field label="Họ tên" hint="Tham số name">
            <TextInput value={draft.name} onChange={(e) => setDraft((c) => ({ ...c, name: e.target.value }))} />
          </Field>
          <Field label="Mã số" hint="Tham số maso">
            <TextInput value={draft.maso} onChange={(e) => setDraft((c) => ({ ...c, maso: e.target.value }))} />
          </Field>
          <Field label="Sắp xếp">
            <Select
              value={draft.sort}
              onChange={(e) => setDraft((c) => ({ ...c, sort: e.target.value as 'asc' | 'desc' }))}
            >
              <option value="asc">Tăng dần</option>
              <option value="desc">Giảm dần</option>
            </Select>
          </Field>
          <Field label="Kích thước trang">
            <Select value={draft.size} onChange={(e) => setDraft((c) => ({ ...c, size: e.target.value, page: '1' }))}>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </Select>
          </Field>

          <div className="filters-actions">
            <Button variant="primary" type="submit" loading={isLoading}>
              Áp dụng
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setDraft(DEFAULT_CITIZEN_LIST_QUERY)
                applyToUrl(DEFAULT_CITIZEN_LIST_QUERY)
              }}
              disabled={isLoading}
            >
              Xoá lọc
            </Button>
          </div>
        </form>
      </Card>

      <Card className="section-card">
        <div className="section-head section-head-row">
          <div>
            <div className="section-title">Kết quả</div>
            <div className="section-subtitle">
              Trang {query.page} • Kích thước {query.size} • Sắp xếp {query.sort.toUpperCase()}
            </div>
          </div>
          <div className="pager">
            <Button
              variant="ghost"
              disabled={!canPrev || isLoading}
              onClick={() => applyToUrl({ ...query, page: String(Math.max(1, page - 1)) })}
            >
              Trước
            </Button>
            <div className="pager-label mono">#{query.page}</div>
            <Button
              variant="ghost"
              disabled={!canNext || isLoading}
              onClick={() => applyToUrl({ ...query, page: String(page + 1) })}
            >
              Sau
            </Button>
          </div>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Mã số</th>
                <th>Họ tên</th>
                <th>Số CCCD</th>
                <th>Điện thoại</th>
                <th>Email</th>
                <th className="table-actions-col">Thao tác</th>
              </tr>
            </thead>
            <tbody className={classNames(isLoading && 'table-loading')}>
              {citizens.length ? (
                citizens.map((citizen) => (
                  <tr key={citizen.id ?? citizen.ma_so}>
                    <td className="mono">{citizen.id ?? '-'}</td>
                    <td className="mono">{citizen.ma_so}</td>
                    <td>
                      {citizen.id ? (
                        <Link to={`/app/citizens/${citizen.id}`} className="table-link">
                          {citizen.ho_ten}
                        </Link>
                      ) : (
                        citizen.ho_ten
                      )}
                    </td>
                    <td className="mono">{citizen.so_cccd}</td>
                    <td className="mono">{citizen.so_dien_thoai}</td>
                    <td>{getCitizenEmail(citizen)}</td>
                    <td className="table-actions">
                      {citizen.id ? (
                        <>
                          <Link to={`/app/citizens/${citizen.id}`} className="btn btn-ghost btn-sm">
                            Xem
                          </Link>
                          <Button
                            variant="danger"
                            size="sm"
                            loading={isDeletingId === citizen.id}
                            onClick={() => void handleDelete(citizen.id)}
                          >
                            Xoá
                          </Button>
                        </>
                      ) : (
                        <span className="muted">-</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="table-empty">
                    {isLoading ? 'Đang tải…' : 'Không có bản ghi phù hợp.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
