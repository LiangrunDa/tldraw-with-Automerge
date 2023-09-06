import {
    TLAnyShapeUtilConstructor,
    TLStoreWithStatus,
    createTLStore,
    defaultShapeUtils
} from '@tldraw/tldraw'
import {useEffect, useRef, useState} from 'react'
import * as Automerge from "@automerge/automerge"
import {Doc} from "@automerge/automerge";
import {RecordsDiff} from "@tldraw/store";
import {RecordId} from "@tldraw/tldraw";

interface AutomergeDocRecord {
    [index: RecordId<never>]:RecordsDiff<never>
}

export function useAutomergeStore({
                                      shapeUtils = [],
                                  }: Partial<{
    shapeUtils: TLAnyShapeUtilConstructor[]
}>) {
    const [store] = useState(() =>
        createTLStore({shapeUtils: [...defaultShapeUtils, ...shapeUtils]})
    )
    const [storeWithStatus, setStoreWithStatus] = useState<TLStoreWithStatus>({
        status: 'loading',
    })

    const doc = useRef<Doc<AutomergeDocRecord>>(Automerge.init())

    useEffect(() => {
        setStoreWithStatus({
            store,
            status: 'synced-remote',
            connectionStatus: 'offline',
        })
        store.listen(
            function syncStoreChangesToAutomergeDoc({changes}) {
                // will never rerender
                doc.current = Automerge.change(doc.current, (d) => {
                    Object.values(changes.added).forEach((record) => {
                        d[record.id] = record
                        console.log("added", record)
                    })

                    Object.values(changes.updated).forEach(([_, record]) => {
                        d[record.id] = record
                        console.log("updated", record)
                    })

                    Object.values(changes.removed).forEach((record) => {
                        delete d[record.id]
                        console.log("removed", record)
                    })
                })
            },
            {source: 'user', scope: 'document'} // only sync user's document changes
        )
    }, [store, doc])

    return {storeWithStatus, doc}
}
