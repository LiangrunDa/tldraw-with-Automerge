import {
    createTLStore,
    defaultShapeUtils,
    DocumentRecordType,
    PageRecordType,
    TLDocument,
    Tldraw,
    TLPageId,
    TLRecord,
    TLStore,
    track,
    useEditor
} from "@tldraw/tldraw";
import '@tldraw/tldraw/tldraw.css'
import * as Automerge from "@automerge/automerge"
import {Doc} from "@automerge/automerge"
import React, {useRef, useState} from "react";
import _ from 'lodash'

export interface AutomergeDocRecord {
    [key: TLRecord['id']]: TLRecord
}

function deepCompareAndUpdate(objectA: any, objectB: any) { // eslint-disable-line
    if (_.isArray(objectB)) {
        if (!_.isArray(objectA)) {
            // if objectA is not an array, replace it with objectB
            objectA = objectB.slice();
        } else {
            // compare and update array elements
            for (let i = 0; i < objectB.length; i++) {
                if (i >= objectA.length) {
                    objectA.push(objectB[i]);
                } else {
                    if (_.isObject(objectB[i]) || _.isArray(objectB[i])) {
                        // if element is an object or array, recursively compare and update
                        deepCompareAndUpdate(objectA[i], objectB[i]);
                    } else if (objectA[i] !== objectB[i]) {
                        // update the element
                        objectA[i] = objectB[i];
                    }
                }
            }
            // remove extra elements
            if (objectA.length > objectB.length) {
                objectA.splice(objectB.length);
            }
        }
    } else if (_.isObject(objectB)) {
        _.forIn(objectB, (value, key) => {
            if (objectA[key] === undefined) {
                // if key is not in objectA, add it
                objectA[key] = value;
            } else {
                if (_.isObject(value) || _.isArray(value)) {
                    // if value is an object or array, recursively compare and update
                    deepCompareAndUpdate(objectA[key], value);
                } else if (objectA[key] !== value) {
                    // update the value
                    objectA[key] = value;
                }
            }
        });
    }
}



function createStore(doc: React.MutableRefObject<Doc<AutomergeDocRecord>>) {
    const store: TLStore = createTLStore({shapeUtils: [...defaultShapeUtils]})
    store.clear()
    store.put([
        DocumentRecordType.create({
            id: 'document:document' as TLDocument['id'],
        }),
        PageRecordType.create({
            id: 'page:page' as TLPageId,
            name: 'Page 1',
            index: 'a1',
        }),
    ])

    const plainDoc = JSON.parse(JSON.stringify(doc.current))

    const toPut = Object.values(plainDoc).map((v) => {
        return v as TLRecord
    })

    store.put(toPut)

    // store.clear()

    store.listen(
        function syncStoreChangesToAutomergeDoc({changes}) {
            // will never rerender
            doc.current = Automerge.change(doc.current, (d) => {
                Object.values(changes.added).forEach((record) => {
                    d[record.id] = record
                    console.log("added", record)
                })
                Object.values(changes.updated).forEach(([, record]) => {
                    deepCompareAndUpdate(d[record.id], record)
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
    return store
}

function App() {

    const doc = useRef(Automerge.init())
    const [store, setStore] = useState(createStore(doc))

    const saveToFile = () => {
        const contents = Automerge.save(doc.current)
        console.log(contents)
        const blob = new Blob([contents], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = "doc";
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }

    const loadFromFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        console.log("loadFromFile")

        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = async () => {
            const contents = reader.result as ArrayBuffer
            console.log(contents)
            const other = Automerge.load(new Uint8Array(contents))
            doc.current = Automerge.merge(doc.current, other)
            console.log(doc.current)
            const newStore = createStore(doc)
            setStore(newStore)
        }
        reader.readAsArrayBuffer(file)
    }


    return (
        <div className="tldraw__editor">
            <Tldraw store={store} shareZone={<NameEditor/>} topZone={<Buttons saveToFile={saveToFile} loadFromFile={loadFromFile} />}/>
        </div>
    )
}

function Buttons({saveToFile, loadFromFile}: { saveToFile: () => void, loadFromFile: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
    return (
        <div style={{pointerEvents: 'all', display: 'flex'}}>
            <input type="file" onChange={loadFromFile}/>
            <button onClick={saveToFile}>Save</button>
        </div>
    )
}

const NameEditor = track(() => {
    const editor = useEditor()

    const { color, name } = editor.user

    return (
        <div style={{ pointerEvents: 'all', display: 'flex' }}>
            <input
                type="color"
                value={color}
                onChange={(e) => {
                    editor.user.updateUserPreferences({
                        color: e.currentTarget.value,
                    })
                }}
            />
            <input
                value={name}
                onChange={(e) => {
                    editor.user.updateUserPreferences({
                        name: e.currentTarget.value,
                    })
                }}
            />
        </div>
    )
})

export default App