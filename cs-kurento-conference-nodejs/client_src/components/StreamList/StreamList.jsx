import React from 'react';

import StreamItem from './partials/StreamItem.jsx'

class StreamList extends React.Component {
    constructor(props){
        super(props);
    }
    render () {
        var streams = this.props.users.map((user)=>{
            return <StreamItem key={user.id}
                               userId={user.id}
                               userName={user.name}
                               current={user.current}
                               socket={this.props.socket}
                               broadcasting={user.broadcasting}
                               isDeskshareSubuser={user.isDeskshareSubuser}
                               sendMessage={this.props.sendMessage}/>
        });

        return <div className="c-stream-list">
                    {streams}
               </div>
    }
}

export default StreamList;