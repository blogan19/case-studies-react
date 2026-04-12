import React, { useMemo, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import ListGroup from 'react-bootstrap/ListGroup';

const SAMPLE_CSV = `drug_name,strength,unit,form,default_route,aliases,category,is_infusion,usual_frequencies,default_dose,default_indication,high_risk,requires_diluent,default_diluent,default_volume,notes
Apixaban,5,mg,tablet,oral,Eliquis,anticoagulant,false,"twice daily",5,Atrial fibrillation,true,false,,,High-risk anticoagulant
Ceftriaxone,1,g,injection,IV,,antibiotic,false,"once daily",1,Sepsis,false,true,Sodium chloride 0.9%,100 mL,Common IV ward antibiotic`;

const DrugLibraryManager = ({ items, metadata, onImport, importing }) => {
  const [csvContent, setCsvContent] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [localNotice, setLocalNotice] = useState('');

  const previewRows = useMemo(() => {
    return items.slice(0, 8);
  }, [items]);

  const handleFileSelected = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const text = await file.text();
    setCsvContent(text);
    setLocalNotice(`Loaded ${file.name} into the import box.`);
  };

  const handleImport = async () => {
    await onImport(csvContent, replaceExisting);
    setCsvContent('');
    setLocalNotice('Drug library imported successfully.');
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'drug-library-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card className="container-shadow mb-4">
      <Card.Body>
        <h5 className="mb-3">Drug Library</h5>
        <p className="text-muted">
          Upload a simple CSV to manage the prescribing library. Expected columns:
          <code className="ms-1">drug_name,strength,unit,form,default_route,aliases,category,is_infusion,usual_frequencies,default_dose,default_indication,high_risk,requires_diluent,default_diluent,default_volume,notes</code>
        </p>

        {localNotice ? <Alert variant="light">{localNotice}</Alert> : null}

        <div className="mb-3">
          <strong>Current library:</strong> {items.length} drugs
          <br />
          <small className="text-muted">Routes stay configurable in the form. Default routes are used to prefill common choices.</small>
        </div>

        {previewRows.length ? (
          <ListGroup className="mb-3">
            {previewRows.map((item) => (
              <ListGroup.Item key={item.id}>
                <strong>{item.drugName}</strong> {item.strength} {item.form}
                <div className="text-muted small">Default route: {item.defaultRoute || 'not set'}</div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        ) : (
          <Alert variant="warning">The drug library is currently empty.</Alert>
        )}

        <Form.Group className="mb-3" controlId="drugLibraryCsvFile">
          <Form.Label>Upload CSV file</Form.Label>
          <Form.Control type="file" accept=".csv,text/csv" onChange={handleFileSelected} />
        </Form.Group>

        <Form.Group className="mb-3" controlId="drugLibraryCsvText">
          <Form.Label>CSV content</Form.Label>
          <Form.Control
            as="textarea"
            rows={8}
            value={csvContent}
            onChange={(event) => setCsvContent(event.target.value)}
            placeholder={SAMPLE_CSV}
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="replaceDrugLibrary">
          <Form.Check
            type="switch"
            label="Replace existing drug library on import"
            checked={replaceExisting}
            onChange={(event) => setReplaceExisting(event.target.checked)}
          />
        </Form.Group>

        <div className="d-flex align-items-center gap-3 flex-wrap">
          <Button type="button" variant="outline-primary" disabled={importing || !csvContent.trim()} onClick={handleImport}>
            {importing ? 'Importing...' : 'Import CSV'}
          </Button>
          <Button type="button" variant="outline-secondary" onClick={handleDownloadTemplate}>
            Download template
          </Button>
          <small className="text-muted">
            Standard frequencies available: {(metadata?.frequencies || []).slice(0, 4).join(', ')}
            {(metadata?.frequencies || []).length > 4 ? '...' : ''}
          </small>
        </div>
      </Card.Body>
    </Card>
  );
};

export default DrugLibraryManager;
