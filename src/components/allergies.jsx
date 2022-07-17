import React, { useState } from 'react';
import Tooltip from 'react-bootstrap/Tooltip';
import Button from 'react-bootstrap/Button';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger'

const Allergies = (props) =>{
    const [allergyButton, setAllergybtn] = useState('')

    let allergies = props.allergyList
    let allergyItems = ''

    if(Array.isArray(allergies) && allergies[0] != 'nkda'){
        allergyItems = allergies.map((allergy) =>
            <li key={allergy}>{allergy}</li>
        )
//        setAllergybtn('Allergies')
    }
    
    return(
        <OverlayTrigger        
                        overlay={(props) => (
                            <Tooltip {...props}>
                                <ul>
                                    {allergyItems}
                                </ul>
                            </Tooltip>
                        )}
                        placement="bottom">
                        <Button variant="outline-danger" > allergy</Button>
        </OverlayTrigger>
    )
}

export default Allergies