import React, { useMemo, useState } from 'react';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Row from 'react-bootstrap/Row';

const getDrugName = (item) => String(item?.drugName || item?.drug_name || item?.name || item || '').trim();

const DrugChoice = ({ question, drugLibrary }) => {
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [badgeText, setBadgeText] = useState('');
  const [badgeType, setBadgeType] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const libraryOptions = useMemo(() => Array.from(new Set((drugLibrary?.items || []).map(getDrugName).filter(Boolean))).sort(), [drugLibrary]);
  const librarySet = useMemo(() => new Set(libraryOptions), [libraryOptions]);
  const options = useMemo(
    () => {
      const authoredOptions = Array.from(new Set((question.answerOptions || [])
        .map((item) => String(item || '').trim())
        .filter((item) => librarySet.has(item))));
      return authoredOptions.length ? authoredOptions : libraryOptions;
    },
    [libraryOptions, librarySet, question.answerOptions]
  );
  const filteredOptions = options.filter((item) => item.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 12);

  const checkAnswer = () => {
    setSubmitted(true);
    if (input === question.answer) {
      setBadgeText('Correct');
      setBadgeType('success');
    } else {
      setBadgeText('Incorrect');
      setBadgeType('danger');
    }
  };

  return (
    <Container className="mt-3 p-3 bg-light text-dark rounded">
      <Row>
        <Col xs={12}>
          <h3>
            Q{question.questionNumber}: {question.questionTitle} <Badge bg={badgeType}>{badgeText}</Badge>
          </h3>
        </Col>
      </Row>
      <hr />
      <Row>
        <Col xs={6}>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>{question.questionText}</Form.Label>
            </Form.Group>
            <InputGroup className="mb-2">
              <Form.Control value={search} disabled={submitted} type="search" placeholder="Search drug library" onChange={(event) => setSearch(event.target.value)} />
              <Button type="button" variant="outline-secondary" disabled={!search || submitted} onClick={() => setSearch('')}>Clear</Button>
            </InputGroup>
            <div className="d-flex gap-2 flex-wrap mb-3">
              {filteredOptions.map((item) => (
                <Button key={item} type="button" size="sm" variant={input === item ? 'primary' : 'outline-primary'} disabled={submitted} onClick={() => { setInput(item); setSearch(''); }}>
                  {item}
                </Button>
              ))}
            </div>
            <Button type="button" variant="primary" onClick={checkAnswer} disabled={!input || submitted}>Submit</Button>
          </Form>
        </Col>
      </Row>
    </Container>
  );
};

export default DrugChoice;
