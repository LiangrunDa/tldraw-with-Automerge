import {useAutomergeStore} from './useAutomergeStore';
import {Tldraw, track, useEditor} from "@tldraw/tldraw";
import '@tldraw/tldraw/tldraw.css'
import * as Automerge from "@automerge/automerge"

function App() {
    const {storeWithStatus: store, doc} = useAutomergeStore({})

    const saveToFile = () => {
        const contents = Automerge.save(doc.current)
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
    return (
        <div className="tldraw__editor">
            <Tldraw autoFocus store={store} shareZone={<NameEditor/>} topZone={<SaveButton saveToFile={saveToFile}/>}/>
        </div>
    )
}

function SaveButton({saveToFile}: { saveToFile: () => void }) {
    return (
        <div style={{pointerEvents: 'all', display: 'flex'}}>
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