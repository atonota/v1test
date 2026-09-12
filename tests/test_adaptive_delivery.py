from fastapi.testclient import TestClient
from app.main import app


def test_production_entry_is_a_split_module():
    response=TestClient(app).get('/')
    assert response.status_code==200
    assert 'type="module"' in response.text
    assert '/assets/' in response.text


def test_no_exclusive_profile_is_eagerly_linked_in_html():
    response=TestClient(app).get('/')
    assert 'compact-' not in response.text
    assert 'wide-' not in response.text


def test_component_sources_and_build_metadata_are_not_public():
    client=TestClient(app)
    for path in ['/frontend/presentations/wide.js','/assets/../main.py','/assets/.vite/manifest.json','/assets/delivery-manifest.json']:
        assert client.get(path).status_code==404


def test_build_rejects_an_eager_import_of_an_exclusive_profile(tmp_path):
    import shutil
    import subprocess
    from pathlib import Path
    repo=Path(__file__).resolve().parents[1]
    shutil.copytree(repo/'frontend',tmp_path/'frontend')
    shutil.copy(repo/'vite.config.js',tmp_path/'vite.config.js')
    shutil.copy(repo/'package.json',tmp_path/'package.json')
    (tmp_path/'node_modules').symlink_to(repo/'node_modules',target_is_directory=True)
    main=tmp_path/'frontend/main.js'
    main.write_text("import './presentations/compact.js';\n"+main.read_text())
    result=subprocess.run(['node',str(repo/'node_modules/vite/bin/vite.js'),'build','--configLoader','runner'],cwd=tmp_path,text=True,capture_output=True,timeout=30)
    assert result.returncode!=0
    assert 'Exclusive presentation leaked into common entry' in result.stdout+result.stderr
