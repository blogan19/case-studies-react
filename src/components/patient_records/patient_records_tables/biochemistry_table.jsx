import React from 'react';
import Table from 'react-bootstrap/Table';
import Container from 'react-bootstrap/Container';

const BiochemistryTable = ({ data, onOpenTrend }) => {
  const category = data[0].category;
  const dateHeaders = data[0]?.results || [];

  return (
    <Container>
      <Table className="tbl-notes container-shadow laboratory-compact-table">
        <thead>
          <tr className="blue-back text-white">
            <th colSpan={dateHeaders.length + 2}>{category}</th>
          </tr>
          <tr>
            <th>Test</th>
            <th>Range</th>
            {dateHeaders.map((result, index) => <th key={`${category}-date-${index}`}>{result.datetime}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => {
            const trendLabel = `${item.name} (${item.unit})`;
            return (
              <tr
                key={item.name}
                className="laboratory-compact-table__row"
                onClick={() => onOpenTrend?.(item)}
              >
                <th className="laboratory-compact-table__test">
                  <button
                    type="button"
                    className="laboratory-compact-table__trigger"
                    onClick={() => onOpenTrend?.(item)}
                  >
                    {trendLabel}
                  </button>
                </th>
                <td>{item.range}</td>
                {item.results.map((result, index) => (
                  <td key={`${item.name}-result-${index}`}>
                    <button
                      type="button"
                      className="laboratory-compact-table__value"
                      onClick={() => onOpenTrend?.(item)}
                    >
                      {result.result}
                    </button>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </Table>
    </Container>
  );
};

export default BiochemistryTable;
